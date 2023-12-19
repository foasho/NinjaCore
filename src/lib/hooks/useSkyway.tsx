import React, {
  useEffect,
  useState,
  useRef,
  RefObject,
  useCallback,
} from "react";
import {
  LocalAudioStream,
  LocalP2PRoomMember,
  LocalSFURoomMember,
  LocalDataStream,
  LocalVideoStream,
  nowInSec,
  P2PRoom,
  RoomMember,
  RoomPublication,
  SfuRoom,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
  uuidV4,
} from "@skyway-sdk/room";
import { SkyWayConfigOptions } from "@skyway-sdk/core";
import { Euler, MathUtils, Vector3 } from "three";
import { IInputMovement } from "../utils";

export enum ECallStatus {
  None = 0,
  Calling = 1,
  RecieveCall = 2,
  Accept = 3,
  Invitation = 4,
  Talking = 5,
  HangUp = 6,
}

export const contextOptions: Partial<SkyWayConfigOptions> = {
  log: { level: "debug" },
};

export interface IPublishData {
  position?: Vector3;
  rotation?: Euler;
  objectURL?: string;
  input?: IInputMovement;
  id?: string;
  username?: string;
  message?: string;
  userData?: { [key: string]: any };
  rtcFrameDelta?: number;
  callingId?: string | null; // 電話をかけている人のID
  callingRoomId?: string | null; // 電話をかけている人のRoomID
  thumbnailImgURL?: string;
  callStatus?: number;
  playerIsOnGround?: boolean; // プレイヤーが地面にいるかどうか
}

export interface IUseSkywayProps {
  roomName: string;
  enabled?: boolean;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  tokenString?: string;
  appId?: string;
  appSecretKey?: string;
  roomOptions?: SkyWayRoom;
  thresholdDistance?: number;
  attach?: string;
  username?: string;
  videoElement?: RefObject<HTMLVideoElement | HTMLAudioElement>;
  maxSubscribers?: number;
}

/**
 * 位置の同期に使用
 * @returns
 */
export const useSkyway = (props: IUseSkywayProps) => {
  const [updateCnt, setUpdateCnt] = useState<string>("");
  const me = useRef<LocalP2PRoomMember | null>(null);
  const members = useRef<RoomMember[]>([]);
  const membersData = useRef<IPublishData[]>([]);
  const roomName = useRef<string | null>(null);
  const roomRef = useRef<P2PRoom | null>(null);
  let localVideo = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const dataStream = useRef<LocalDataStream | null>(null);
  const maxSubscribers = props.maxSubscribers ? props.maxSubscribers : 320; // 最大320人まで
  const callingId = useRef<string | null>(null); // 電話をかけている人のID
  const callingRoomId = useRef<string | null>(null); // 電話をかけている人のRoomID
  const recieveUser = useRef<IPublishData | null>(null); // 電話を受け取っている人のデータ
  const callStatus = useRef<ECallStatus>(ECallStatus.None);
  const [callUsers, setCallUsers] = useState<IPublishData[]>([]);

  useEffect(() => {
    /**
     * Roomに参加する
     */
    const RoomJoin = async () => {
      if (typeof window === "undefined") {
        return;
      }
      if (!roomName.current) return;
      /**
       * 1.SkywayAuthTokenを作成する
       */
      let token = props.tokenString ? props.tokenString : undefined;
      if (token === undefined || (token && token.length == 0)) {
        token = new SkyWayAuthToken({
          jti: uuidV4(),
          iat: nowInSec(),
          exp: nowInSec() + 3600 * 24,
          scope: {
            app: {
              id: process.env.NEXT_PUBLIC_SKYWAY_APP_ID!,
              turn: true,
              actions: ["read"],
              channels: [
                {
                  id: "*",
                  name: "*",
                  actions: ["write"],
                  members: [
                    {
                      id: "*",
                      name: "*",
                      actions: ["write"],
                      publication: {
                        actions: ["write"],
                      },
                      subscription: {
                        actions: ["write"],
                      },
                    },
                  ],
                  sfuBots: [
                    {
                      actions: ["write"],
                      forwardings: [
                        {
                          actions: ["write"],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        }).encode(process.env.NEXT_PUBLIC_SKYWAY_APP_SECRET_KEY!);
      }

      // 2.VideoStreamをアタッチ
      if (props.videoElement) {
        localVideo = props.videoElement;
      } else {
        // @ts-ignore
        localVideo.current = document.createElement("video");
        localVideo.current.autoplay = true;
        localVideo.current.muted = true;
        if (localVideo.current instanceof HTMLVideoElement) {
          localVideo.current.playsInline = true; // これはiOSで動かない
        }
      }

      try {
        // @ts-ignorew
        dataStream.current = await SkyWayStreamFactory.createDataStream();

        // 3.SkywayContextを作成する
        const context = await SkyWayContext.Create(token);

        // 4.P2PRoomに参加/作成する
        await createRoom(context, "p2p", roomName.current);
      } catch (e) {
        console.log("", e);
      }
    };

    // Enableがtrueの場合に自動で、Skywayに接続する
    if (
      typeof window !== "undefined" &&
      (!roomRef.current || roomName.current !== props.roomName)
    ) {
      if (!roomRef.current && !me.current) {
        // @ts-ignore
        roomName.current = props.roomName;
        RoomJoin();
      }
    }

    return () => {
      if (me.current && roomRef.current) {
        // 退出して初期化
        roomRef.current.leave(me.current);
        me.current = null;
        roomRef.current = null;
        members.current = [];
        membersData.current = [];
        dataStream.current = null;
        callingId.current = null;
        setCallUsers([]);
        if (localVideo.current) {
          localVideo.current.srcObject = null;
          localVideo.current = null;
        }
      }
    };
  }, [props.enabled, props.roomName]);

  /**
   * メンバーのデータを取得する
   */
  const getPData = useCallback(
    (id: string): IPublishData | null => {
      const memberData = membersData.current.find((data) => data.id === id);
      return memberData || null;
    },
    [membersData]
  );

  /**
   * SkywayでRoomを参加する[P2P]
   */
  const createRoom = async (
    context: SkyWayContext,
    type: "p2p",
    name: string
  ) => {
    roomRef.current = await SkyWayRoom.FindOrCreate(context, {
      type: type,
      name: name,
      id: name,
    });
    me.current = await roomRef.current.join();

    if (dataStream.current) {
      try {
        await me.current.publish(dataStream.current, {
          maxSubscribers: maxSubscribers,
        });
      } catch (e) {
        console.log("DataStreamのPublishに失敗しました。: ", e);
      }
    }

    // ルーム内に新しいメンバーが入室したときに呼ばれる
    roomRef.current.onMemberJoined.add((e) => {
      addMember(e.member);
      console.log("新しいユーザーが入室しました。: ", e.member);
    });

    // ルーム内にメンバーが退出したときに呼ばれる
    roomRef.current.onMemberLeft.add((e) => {
      removeMember(e.member);
      console.log(e.member.id + "ユーザーが退出しました。: ", e.member);
    });

    // ルーム内に既に存在するメンバーのStreamをSubscribeする
    roomRef.current.publications.forEach(subscribeAndAttach);
    // ルーム内に新しいメンバーがStreamをPublishしたときに呼ばれる
    roomRef.current.onStreamPublished.add((e) =>
      subscribeAndAttach(e.publication)
    );
    // ルーム内にメンバーがStreamをUnpublishしたときに呼ばれる
    roomRef.current.onStreamUnpublished.add((e) => {
      console.log("StreamがUnpublishされました。: ", e.publication);
    });
  };

  /**
   * データをSubscribeする(受信)
   */
  const subscribeAndAttach = async (publication: RoomPublication) => {
    try {
      if (!me.current) return;
      if (publication.publisher.id == me.current.id) return;
      // 重複チェック
      const { stream } = await me.current.subscribe(publication.id);
      switch (stream.contentType) {
        case "data": {
          stream.onData.add((data) => {
            // JSONデータに変換
            const pdata = JSON.parse(data as string) as IPublishData;
            // Position/Rotationを更新する
            if (pdata.position) {
              pdata.position = new Vector3().copy(pdata.position);
            }
            if (pdata.rotation) {
              pdata.rotation = new Euler().copy(pdata.rotation);
            }
            // メンバーデータをセットする
            setMemberData(pdata);
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  /**z
   * メンバーデータをセットする
   */
  const setMemberData = (pdata: IPublishData) => {
    const index = membersData.current.findIndex((m) => m.id == pdata.id);
    if (index >= 0) {
      if (membersData.current.length == 0) {
        setUpdateCnt(MathUtils.generateUUID());
      }
      membersData.current[index] = { ...pdata };
    } else {
      // 新しいメンバーの場合は、破壊的に追加する
      const _membersData = membersData.current;
      _membersData.push({ ...pdata });
      membersData.current = [..._membersData];
      setUpdateCnt(MathUtils.generateUUID());
    }
    // メンバーのデータを更新する
    if (me.current) {
      if (
        // 自分が通話のない状態で、
        // 自分当ての電話の呼び出しあれば呼び出し中にする
        pdata.callingId == me.current.id &&
        pdata.callStatus == ECallStatus.Calling &&
        callStatus.current == ECallStatus.None
      ) {
        callStatus.current = ECallStatus.RecieveCall;
        const index = membersData.current.findIndex((d) => d.id == pdata.id);
        if (index >= 0 && !recieveUser.current) {
          recieveUser.current = pdata;
          setUpdateCnt(MathUtils.generateUUID());
        }
      } else if (
        // 自分宛ての通話招待があればよびだし中にする
        pdata.callingRoomId &&
        callStatus.current == ECallStatus.None &&
        pdata.callStatus == ECallStatus.Invitation
      ) {
        console.log("既存の通話に招待きている");
        callStatus.current = ECallStatus.RecieveCall;
        const index = membersData.current.findIndex((d) => d.id == pdata.id);
        if (index >= 0 && !recieveUser.current) {
          recieveUser.current = pdata;
          setUpdateCnt(MathUtils.generateUUID());
        }
      } else if (
        // 自分が電話を書けていて、相手がAcceptした場合は、通話中にする
        pdata.id === callingId.current &&
        callStatus.current == ECallStatus.Calling &&
        pdata.callStatus == ECallStatus.Accept
      ) {
        console.log("Talking Success");
        callStatus.current = ECallStatus.Talking;
        setUpdateCnt(MathUtils.generateUUID());
      } else if (
        // 自分が誰かに電話をかけていて、相手が電話を切った場合は、呼び出し中を解除する
        callStatus.current == ECallStatus.Calling &&
        pdata.callStatus == ECallStatus.HangUp
      ) {
        // 呼び出し中になっていて切れた場合は、呼び出し中を解除する
        const index = callUsers.findIndex((d) => d.id == pdata.id);
        let _callUsers = callUsers;
        if (index >= 0) {
          console.log("通話参加者から１名抜けました");
          _callUsers.splice(index, 1);
          setCallUsers([..._callUsers]);
        }
        const rindex = membersData.current.findIndex((d) => d.id == pdata.id);
        if (rindex >= 0) {
          recieveUser.current = null;
        }
        // 0人になったら、呼び出し中を解除する
        if (_callUsers.length == 0) {
          console.log("通話参加者がいなくなりました");
          callStatus.current = ECallStatus.None;
          setUpdateCnt(MathUtils.generateUUID());
        }
      } else if (
        // Invitationしたユーザーが、通話を拒否した場合は、呼び出し中を解除する
        callStatus.current == ECallStatus.Invitation &&
        (pdata.callStatus == ECallStatus.HangUp ||
          pdata.callStatus == ECallStatus.Accept)
      ) {
        // 自分のステータスをTalkingにする
        callStatus.current = ECallStatus.Talking;
      } else if (
        pdata.callingRoomId &&
        callingRoomId.current == pdata.callingRoomId &&
        pdata.callStatus === ECallStatus.Talking
      ) {
        console.log("pdata-callStatus: ", pdata.callStatus);
        console.log("My - callStatus: ", callStatus.current);
        // 同じルームにいる人がいれば、RecieveCallDataに追加する
        const index = callUsers.findIndex((d) => d.id == pdata.id);
        if (index < 0) {
          console.log("通話に新しいユーザーが参加しました");
          const _callUsers = callUsers;
          _callUsers.push(pdata);
          setCallUsers([..._callUsers]);
          setUpdateCnt(MathUtils.generateUUID());
        }
        // 現在の参加人数が2人以上なら、通話中にする
        console.log("通話参加人数: ", callUsers.length);
      }
    }
  };

  /**
   * データを送信する
   */
  const publishData = useCallback(
    (pdata: IPublishData) => {
      if (dataStream.current) {
        if (!pdata.id) {
          pdata.id = me.current?.id;
        }
        pdata.callStatus = callStatus.current;
        pdata.callingId = callingId.current;
        pdata.callingRoomId = callingRoomId.current;
        const sendData = JSON.stringify({ ...pdata });
        dataStream.current.write(sendData);
      }
    },
    [dataStream.current, callStatus.current, me.current]
  );

  /**
   * SkywayでRoomを退出する
   */
  const leaveRoom = async () => {
    await roomRef.current!.leave(me.current!);
  };

  /**
   * メンバーが追加
   */
  const addMember = (member: RoomMember) => {
    if (me.current && member.id == me.current.id) return;
    const newMbs = members.current;
    newMbs.push(member);
    members.current = [...newMbs];
    setUpdateCnt(MathUtils.generateUUID());
  };

  /**
   * メンバーが削除
   */
  const removeMember = (member: RoomMember) => {
    if (me.current && member.id == me.current.id) return;
    const newMbs = members.current.filter((m) => m.id !== member.id);
    members.current = [...newMbs];
    membersData.current = membersData.current.filter((m) => m.id !== member.id);
    // 自分のSubscribeからも削除する
    me.current!.subscriptions.forEach((s) => {
      if (s.id == member.id) {
        console.log("unsubscribe: ", s.id, " / ", member.id);
        me.current!.unsubscribe(s.id);
      }
    });
    setUpdateCnt(MathUtils.generateUUID());
  };

  /**
   * ユーザーに電話をかける/電話に出る
   */
  const Calling = (userId: string, roomId: string) => {
    callingId.current = userId;
    callingRoomId.current = roomId;
    setUpdateCnt(MathUtils.generateUUID());
    console.log("通話をかけました。");
  };

  /**
   * 電話を切る
   */
  const HangUp = () => {
    callingId.current = null;
    callingRoomId.current = null;
    setCallUsers([]);
  };

  /**
   * 電話にでる
   */
  const TakeCall = (callId: string, roomId: string) => {
    callingId.current = callId;
    callingRoomId.current = roomId;
    setUpdateCnt(MathUtils.generateUUID());
  };

  const updateCallStatus = (status: ECallStatus) => {
    callStatus.current = status;
  };

  return {
    me: me.current,
    updateCnt: updateCnt,
    publishData: publishData,
    leaveRoom: leaveRoom,
    localVideo: localVideo,
    members: members.current,
    membersData: membersData.current,
    getPData: getPData,
    Calling: Calling,
    HangUp: HangUp,
    TakeCall: TakeCall,
    callUsers: callUsers,
    recieveUser: recieveUser.current,
    callStatus: callStatus.current,
    updateCallStatus: updateCallStatus,
  };
};

/**
 * プライベート通話には、SFUを利用する
 */
export interface IPrivateCallProps {
  token: string;
  audio: boolean;
  video: boolean;
  localVideo: HTMLVideoElement;
  myId: string;
  onStreamCallback?: (elm: HTMLVideoElement | HTMLAudioElement) => void;
}

export enum ICallRole {
  Owner = "Owner", // 電話をかけた人
  Joiner = "Joiner", // 電話に参加した人
}

// PrivateCallのRoom
export class MyPrivateCall {
  role: ICallRole | null = null;
  me: LocalSFURoomMember | null = null;
  context: SkyWayContext | null = null;
  room: SfuRoom | null = null;
  audioStream: LocalAudioStream | null = null;
  videoStream: LocalVideoStream | null = null;
  mediaStream: MediaStream | null = null;
  maxSubscribers: number = 8;
  params: IPrivateCallProps;

  // 最初はパラメータのみ控えておく
  constructor(props: IPrivateCallProps) {
    this.params = { ...props };
  }

  /**
   * PrivateCallを開始
   * @param roomId
   */
  async startPrivateCall(roomId: string, role: ICallRole) {
    const props = this.params;
    this.context = await SkyWayContext.Create(props.token);
    await this.CreateRoom(roomId);
    if (this.room) {
      // // ルーム内に既に存在するメンバーのStreamをSubscribeする
      this.room.publications.forEach((publish) => {
        console.log("already exist member: ", publish.id, " / ", this.me?.id);
        this.subscribeAndAttach(props, publish);
      });
      // ルーム内に新しいメンバーがStreamをPublishしたときに呼ばれる
      this.room.onStreamPublished.add((e) => {
        console.log(
          "onStreamPublished: ",
          e.publication.id,
          " / ",
          this.me?.id
        );
        this.subscribeAndAttach(props, e.publication);
      });

      // ルーム内に既に存在するメンバーのStreamをSubscribeする
      this.room.publications.forEach((pub) => {
        console.log("New User: ", pub.id, " / ", this.me?.id);
        this.subscribeAndAttach(props, pub);
      });
      this.role = role;
    }
  }

  // ルームの作成
  private async CreateRoom(roomId: string) {
    if (!this.context) return;
    this.room = await SkyWayRoom.FindOrCreate(this.context, {
      type: "sfu",
      name: roomId,
      id: roomId,
    });
    this.me = await this.room.join();
    this.publishStream();
  }

  private async publishStream() {
    if (this.params.video || this.params.audio) {
      try {
        const { audio, video } =
          await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream({
            video: { height: 640, width: 360, frameRate: 15 }, // 品質を落とす
          });
        if (this.params.video) {
          this.videoStream = video;
        }
        if (this.params.audio) {
          this.audioStream = audio;
        }
        video.attach(this.params.localVideo);
        await this.params.localVideo.play();
        if (this.params.audio) {
          this.enableAudio();
        }
        if (this.params.video) {
          this.enableVideo();
        }
      } catch (e) {}
    }
  }

  /**
   * 通話を切る
   */
  public destroyRoom = async () => {
    if (this.room) {
      if (this.role == ICallRole.Owner) {
        // ルームを削除する
        await this.room.close();
      } else if (this.me) {
        // ルームから退出する
        await this.room.leave(this.me);
      }
      this.context = null;
      this.room = null;
      this.me = null;
      this.audioStream = null;
      this.videoStream = null;
      this.role = null;
    }
  };

  /**
   * 音声を有効にする
   * ※自分のStreamデータを送信する
   */
  public enableAudio = async () => {
    if (this.audioStream && this.me) {
      await this.me.publish(this.audioStream, {
        maxSubscribers: this.maxSubscribers,
      });
    }
  };

  /**
   * 音声を無効にする
   */
  public disableAudio = async () => {};

  /**
   * ビデオを有効にする(送信)
   * ※自分のStreamデータを送信する
   */
  public enableVideo = async () => {
    if (this.videoStream) {
      await this.me!.publish(this.videoStream, {
        maxSubscribers: this.maxSubscribers,
        encodings: [
          { maxBitrate: 80_000, id: "low" },
          { maxBitrate: 400_000, id: "high" },
        ],
      });
    }
  };

  /**
   * 画面共有を有効にする
   */
  public enableScreenShare = async () => {
    navigator.mediaDevices
      .getDisplayMedia({
        video: true,
        audio: true,
      })
      .then((_mediaStream) => {
        // 自分用のStream
        this.mediaStream = new MediaStream();
        let videoTrack = _mediaStream.getVideoTracks()[0];
        if (videoTrack) {
          this.mediaStream.addTrack(videoTrack);
        }
      });
  };

  /**
   * 音声,ビデオをSubscribeする
   * (受信)
   */
  private subscribeAndAttach = async (
    props: IPrivateCallProps,
    publication: RoomPublication
  ) => {
    try {
      if (!this.me) return;
      if (publication.publisher.id == this.me.id) return;
      const { stream } = await this.me.subscribe(publication.id);
      switch (stream.contentType) {
        case "video":
          {
            console.log("video", stream);
            const elm = document.createElement("video");
            elm.playsInline = true;
            elm.autoplay = true;
            stream.attach(elm);
            if (props.onStreamCallback) props.onStreamCallback(elm);
          }
          break;
        case "audio":
          {
            console.log("audio", stream);
            const elm = document.createElement("audio");
            elm.controls = true;
            elm.autoplay = true;
            stream.attach(elm);
            if (props.onStreamCallback) props.onStreamCallback(elm);
          }
          break;
      }
    } catch (e) {
      console.log(e);
    }
  };

  /**
   * RoomIDを取得する
   */
  public getRoomId = () => {
    if (!this.room) return null;
    return this.room.id;
  };
}
