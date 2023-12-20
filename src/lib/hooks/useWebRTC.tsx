import React, {
  MutableRefObject,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { MathUtils, Vector3 } from "three";
import {
  IPublishData,
  useSkyway,
  ECallStatus,
  MessageProps,
} from "./useSkyway";
import { ICallRole, MyPrivateCall } from "./SkywayHelper/PrivateCall";
import { LocalP2PRoomMember } from "@skyway-sdk/room";

type WebRTCContextType = {
  audioStream: MutableRefObject<MediaStream | null>;
  videoStream: MutableRefObject<MediaStream | null>;
  turnOnAudio: () => Promise<boolean>;
  turnOffAudio: () => void;
  turnOnVideo: (select?: "value" | "min" | "max") => Promise<boolean>;
  turnOffVideo: () => void;
  publishData?: (pdata: IPublishData) => void;
  roomName: string;
  me: MutableRefObject<LocalP2PRoomMember | null>;
  membersData: IPublishData[];
  getMemberData: (id: string) => IPublishData | undefined;
  callUsers: MutableRefObject<IPublishData[]>;
  StartCall: (memberId: string) => Promise<void>;
  InviteCall: (memberId: string) => Promise<void>;
  JoinCall: (callId: string, roomId: string) => Promise<void>;
  TakeCall: (callId: string, roomId: string) => void;
  HangUpCall: () => void;
  EndCall: () => Promise<void>;
  recieveUser: IPublishData | null;
  callStatus: ECallStatus;
  updateCallStatus: (status: ECallStatus) => void;
  roomMessages: MutableRefObject<MessageProps[]>;
};
const WebRTCContext = createContext<WebRTCContextType>({
  audioStream: { current: null },
  videoStream: { current: null },
  turnOnAudio: async () => false,
  turnOffAudio: () => {},
  turnOnVideo: async () => false,
  turnOffVideo: () => {},
  publishData: () => {},
  roomName: "",
  me: { current: null },
  membersData: [],
  getMemberData: (id: string) => undefined,
  callUsers: { current: [] },
  StartCall: async (memberId: string) => {},
  InviteCall: async (memberId: string) => {},
  JoinCall: async (roomId: string) => {},
  TakeCall: () => {},
  HangUpCall: () => {},
  EndCall: async () => {},
  recieveUser: null,
  callStatus: ECallStatus.None,
  updateCallStatus: (status: ECallStatus) => {},
  roomMessages: { current: [] },
});
export const useWebRTC = () => useContext(WebRTCContext);
let webrtc = 0;

type WebRTCProviderProps = {
  roomName: string;
  token?: string;
  children: React.ReactNode;
};
export const WebRTCProvider = ({
  roomName,
  token = "",
  children,
}: WebRTCProviderProps) => {
  const {
    publishData,
    membersData,
    me,
    callUsers,
    recieveUser,
    callStatus,
    updateCallStatus,
    Calling, // 電話をかける
    HangUp, // 電話を切る
    TakeCall, // 電話を受ける
    roomMessages,
  } = useSkyway({
    roomName: roomName,
    tokenString: token,
  });
  console.log("WebRTCProvider Render Count: ", webrtc++);
  const audioStream = useRef<MediaStream | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const curPosition = useRef<Vector3>(new Vector3(0, 0, 0));
  const localVodeo = useRef<HTMLVideoElement>(document.createElement("video"));
  const [CallSFURoom, setCallSFURoom] = useState<MyPrivateCall | null>(null);

  // 最初にプライベートCallクラスを追加
  useEffect(() => {
    if (me.current && me.current.id) {
      const newCallRoom = new MyPrivateCall({
        token: token,
        audio: true,
        video: false,
        localVideo: localVodeo.current,
        myId: me.current.id,
      });
      setCallSFURoom(newCallRoom);
    }
    return () => {
      setCallSFURoom(null);
    };
  }, [me]);

  // RTCDataChannelでデータを送信する(中継)
  const sendRTCData = (data: IPublishData) => {
    if (publishData) {
      publishData(data);
    }
  };

  // プライベートCallで新しい通話を開始する
  const StartCall = async (memberId: string) => {
    const roomId = MathUtils.generateUUID();
    if (CallSFURoom) {
      await CallSFURoom.startPrivateCall(roomId, ICallRole.Owner);
      // callStatus.current = ECallStatus.Calling;
      // 特定のIDをもつメンバーに通話を要請
      Calling(memberId, roomId);
    }
  };

  // プライベートCallで通話に招待する
  const InviteCall = async (memberId: string) => {
    if (CallSFURoom) {
      const roomId = CallSFURoom.getRoomId();
      if (roomId) {
        // 特定のIDをもつメンバーに通話を要請
        Calling(memberId, roomId);
      }
    } else {
      console.error("CallSFURoomが存在しません");
    }
  };

  // プライベートCallで通話に参加する
  const JoinCall = async (
    callId: string,
    roomId: string,
    isInvitation: boolean = false // 招待か
  ) => {
    if (CallSFURoom && roomId) {
      console.info("START > ---- 通話 -----");
      await CallSFURoom.startPrivateCall(roomId, ICallRole.Joiner);
      if (!isInvitation) {
        TakeCall(callId, roomId);
      } else {
      }
    }
  };

  // 掛かってきている電話を切る
  const HangUpCall = async () => {
    if (CallSFURoom) {
      await CallSFURoom.destroyRoom();
    }
    HangUp();
    updateCallStatus(ECallStatus.HangUp);
    setTimeout(() => {
      updateCallStatus(ECallStatus.None);
    }, 1000);
  };

  // プライベートCallで通話を終了する
  const EndCall = async () => {
    HangUp();
    // callStatus.current = ECallStatus.None;
    if (CallSFURoom) {
      await CallSFURoom.destroyRoom();
    }
  };

  // ビデオ設定
  const videoSettings = {
    width: { value: 1280, min: 640, max: 1920 },
    height: { value: 720, min: 480, max: 1080 },
    frameRate: { value: 30, min: 15, max: 60 },
  };

  const turnOnAudio = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream;
      // setAudioStream(stream);
      return true;
    } catch (error) {
      console.error("Failed to access the microphone:", error);
    }
    return false;
  };

  const turnOffAudio = () => {
    if (audioStream.current) {
      audioStream.current.getTracks().forEach((track) => track.stop());
      audioStream.current = null;
    }
  };

  const turnOnVideo = async (
    select: "value" | "min" | "max" = "min"
  ): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: videoSettings.width[select] },
          height: { ideal: videoSettings.height[select] },
          frameRate: { ideal: videoSettings.frameRate[select] },
        },
      });
      videoStream.current = stream;
    } catch (error) {
      console.error("Failed to access the camera:", error);
    }
    return false;
  };

  const turnOffVideo = () => {
    if (videoStream.current) {
      videoStream.current.getTracks().forEach((track) => track.stop());
      videoStream.current = null;
    }
  };

  const getMemberData = (id: string): IPublishData | undefined => {
    if (membersData.length === 0) {
      return undefined;
    }
    return membersData.filter((data) => data.id === id)[0];
  };

  return (
    <WebRTCContext.Provider
      value={{
        audioStream,
        videoStream,
        turnOnAudio,
        turnOffAudio,
        turnOnVideo,
        turnOffVideo,
        roomName,
        me,
        membersData,
        getMemberData,
        publishData: sendRTCData,
        callUsers,
        StartCall,
        InviteCall,
        JoinCall,
        TakeCall,
        HangUpCall,
        EndCall,
        recieveUser,
        callStatus,
        updateCallStatus,
        roomMessages,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};

// tokenでMemo化する
export const MemoWebRTCProvider = React.memo(WebRTCProvider, (prev, next) => {
  return prev.token === next.token;
});
