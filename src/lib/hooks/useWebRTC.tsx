import { useInputControl } from "./useInputControl";
import React, {
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
  MyPrivateCall,
  ECallStatus,
  ICallRole,
} from "./useSkyway";
import { IInputMovement } from "../utils";

type WebRTCContextType = {
  audioStream: MediaStream | null;
  videoStream: MediaStream | null;
  turnOnAudio: () => Promise<boolean>;
  turnOffAudio: () => void;
  turnOnVideo: (select?: "value" | "min" | "max") => Promise<boolean>;
  turnOffVideo: () => void;
  attachRunBtn: (id: string) => void;
  attachJumpBtn: (id: string) => void;
  publishData?: (pdata: IPublishData) => void;
  input: IInputMovement;
  roomName: string;
  me: any;
  membersData: IPublishData[];
  updateCnt: string;
  getMemberData: (id: string) => IPublishData | undefined;
  curPosition: Vector3;
  updateCurPosition: (position: Vector3) => void;
  curMessage: string;
  updateCurMessage: (message: string) => void;
  activeDistance: number;
  callUsers: IPublishData[];
  StartCall: (memberId: string) => Promise<void>;
  InviteCall: (memberId: string) => Promise<void>;
  JoinCall: (callId: string, roomId: string) => Promise<void>;
  TakeCall: (callId: string, roomId: string) => void;
  HangUpCall: () => void;
  EndCall: () => Promise<void>;
  enabled: boolean;
  updateEnable: (enable: boolean) => void;
  recieveUser: IPublishData | null;
  callStatus: ECallStatus;
  updateCallStatus: (status: ECallStatus) => void;
  saveMessage: (
    roomId: string,
    userId: string,
    message: string,
    sendUserId: string | null
  ) => Promise<void>;
};
const WebRTCContext = createContext<WebRTCContextType>({
  audioStream: null,
  videoStream: null,
  turnOnAudio: async () => false,
  turnOffAudio: () => {},
  turnOnVideo: async () => false,
  turnOffVideo: () => {},
  publishData: () => {},
  attachRunBtn: (id: string) => {},
  attachJumpBtn: (id: string) => {},
  input: {
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    jump: false,
    dash: false,
    action: false,
    speed: 1,
    prevDrag: null,
    curDrag: null,
    pressedKeys: [],
    angleAxis: [0, 0],
  },
  roomName: "",
  me: undefined,
  membersData: [],
  updateCnt: "",
  getMemberData: (id: string) => undefined,
  curPosition: new Vector3(0, 0, 0),
  updateCurPosition: (position: Vector3) => {},
  curMessage: "",
  updateCurMessage: (message: string) => {},
  activeDistance: 50,
  callUsers: [],
  StartCall: async (memberId: string) => {},
  InviteCall: async (memberId: string) => {},
  JoinCall: async (roomId: string) => {},
  TakeCall: () => {},
  HangUpCall: () => {},
  EndCall: async () => {},
  enabled: false,
  updateEnable: (enable: boolean) => {},
  recieveUser: null,
  callStatus: ECallStatus.None,
  updateCallStatus: (status: ECallStatus) => {},
  saveMessage: async (
    roomId: string,
    userId: string,
    message: string,
    sendUserId: string | null
  ) => {},
});
export const useWebRTC = () => useContext(WebRTCContext);
let webrtc = 0;

type WebRTCProviderProps = {
  roomName: string;
  token?: string;
  font?: string;
  children: React.ReactNode;
};
export const WebRTCProvider = ({
  roomName,
  token = "",
  font = "/fonts/MPLUS1-Regular.ttf",
  children,
}: WebRTCProviderProps) => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const { input, attachRunBtn, attachJumpBtn } = useInputControl({
    margin: [48, 64],
    joyColor: "#43D9D9",
    targetId: "joycon",
    enabled: enabled,
  });
  const {
    publishData,
    membersData,
    me,
    updateCnt,
    callUsers,
    recieveUser,
    callStatus,
    updateCallStatus,
    Calling, // 電話をかける
    HangUp, // 電話を切る
    TakeCall, // 電話を受ける
  } = useSkyway({
    enabled: enabled,
    roomName: roomName,
    tokenString: token,
  });
  const timer = useRef<NodeJS.Timeout | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const curPosition = useRef<Vector3>(new Vector3(0, 0, 0));
  const [curMessage, setCurMessage] = useState<string>("");
  const [activeDistance, setActiveDistance] = useState(50);
  const localVodeo = useRef<HTMLVideoElement>(document.createElement("video"));
  const [CallSFURoom, setCallSFURoom] = useState<MyPrivateCall | null>(null);

  // 最初にプライベートCallクラスを追加
  useEffect(() => {
    if (me && me.id) {
      const newCallRoom = new MyPrivateCall({
        token: token,
        audio: true,
        video: false,
        localVideo: localVodeo.current,
        myId: me?.id,
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
      // data.callStatus = callStatus.current;
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
      console.log("通話始めるよ");
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
      setAudioStream(stream);
      return true;
    } catch (error) {
      console.error("Failed to access the microphone:", error);
    }
    return false;
  };

  const turnOffAudio = () => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
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
      setVideoStream(stream);
    } catch (error) {
      console.error("Failed to access the camera:", error);
    }
    return false;
  };

  const turnOffVideo = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
  };

  const getMemberData = (id: string): IPublishData | undefined => {
    if (membersData.length === 0) {
      return undefined;
    }
    return membersData.filter((data) => data.id === id)[0];
  };

  const updateCurPosition = (position: Vector3) => {
    curPosition.current.copy(position.clone());
  };

  const updateCurMessage = (message: string) => {
    setCurMessage(message);
  };

  const updateEnable = (enable: boolean) => {
    // 1秒後に有効にする,すでにTimerがあればClearにしてい新規に設定
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      setEnabled(enable);
    }, 1000);
  };

  /**
   * メッセージをDBに保存する
   */
  const saveMessage = async (
    roomId: string,
    userId: string,
    message: string,
    sendUserId: string | null = null
  ) => {
    fetch("/api/message/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        roomId,
        userId,
        sendUserId,
      }),
    });
  };

  /**
   * 閲覧ログをDBに保存する
   */
  const saveViewLog = async (objectId: string, userId: string) => {};

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
        input,
        attachRunBtn,
        attachJumpBtn,
        me,
        membersData,
        updateCnt,
        getMemberData,
        publishData: sendRTCData,
        curPosition: curPosition.current,
        updateCurPosition,
        curMessage: curMessage,
        updateCurMessage,
        activeDistance,
        callUsers,
        StartCall,
        InviteCall,
        JoinCall,
        TakeCall,
        HangUpCall,
        EndCall,
        enabled,
        updateEnable,
        recieveUser,
        callStatus,
        updateCallStatus,
        saveMessage,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};

/**
 * LocalHost用にダミーのWebRTCProviderを作成する
 */
export const DummyWebRTCProvider = ({
  roomName,
  token = "",
  font = "/fonts/MPLUS1-Regular.ttf",
  children,
}: WebRTCProviderProps) => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const { input, attachRunBtn, attachJumpBtn } = useInputControl({
    margin: [48, 64],
    joyColor: "#43D9D9",
    targetId: "joycon",
    enabled: enabled,
  });
  const {
    publishData,
    membersData,
    me,
    updateCnt,
    callUsers,
    recieveUser,
    callStatus,
    updateCallStatus,
    Calling, // 電話をかける
    HangUp, // 電話を切る
    TakeCall, // 電話を受ける
  } = useSkyway({
    enabled: enabled,
    roomName: roomName,
    tokenString: token,
  });
  const timer = useRef<NodeJS.Timeout | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const curPosition = useRef<Vector3>(new Vector3(0, 0, 0));
  const [curMessage, setCurMessage] = useState<string>("");
  const [activeDistance, setActiveDistance] = useState(50);
  const localVodeo = useRef<HTMLVideoElement>(document.createElement("video"));
  const [CallSFURoom, setCallSFURoom] = useState<MyPrivateCall | null>(null);

  useEffect(() => {
    return () => {
      setCallSFURoom(null);
    };
  }, []);

  const sendRTCData = (data: IPublishData) => {};
  const StartCall = async (memberId: string) => {};
  const InviteCall = async (memberId: string) => {};
  const JoinCall = async (callId: string, roomId: string) => {};
  const HangUpCall = async () => {};
  const EndCall = async () => {};
  const turnOnAudio = async (): Promise<boolean> => {
    return false;
  };
  const turnOffAudio = () => {};
  const turnOnVideo = async (
    select: "value" | "min" | "max" = "min"
  ): Promise<boolean> => {
    return false;
  };
  const turnOffVideo = () => {};
  const getMemberData = (id: string): IPublishData | undefined => {
    return undefined;
  };
  const updateCurPosition = (position: Vector3) => {};
  const updateCurMessage = (message: string) => {};
  const updateEnable = (enable: boolean) => {
    // 1秒後に有効にする,すでにTimerがあればClearにしてい新規に設定
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      setEnabled(enable);
    }, 1000);
  };
  const saveMessage = async (
    roomId: string,
    userId: string,
    message: string,
    sendUserId: string | null = null
  ) => {};

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
        input,
        attachRunBtn,
        attachJumpBtn,
        me,
        membersData,
        updateCnt,
        getMemberData,
        publishData: sendRTCData,
        curPosition: curPosition.current,
        updateCurPosition,
        curMessage: curMessage,
        updateCurMessage,
        activeDistance,
        callUsers,
        StartCall,
        InviteCall,
        JoinCall,
        TakeCall,
        HangUpCall,
        EndCall,
        enabled,
        updateEnable,
        recieveUser,
        callStatus,
        updateCallStatus,
        saveMessage,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};
