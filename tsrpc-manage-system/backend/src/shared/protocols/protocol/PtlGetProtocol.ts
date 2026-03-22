import { BaseRequest, BaseResponse } from "../base";

/** 获取游戏协议请求（无需参数） */
export interface ReqGetProtocol extends BaseRequest {}

/** 协议服务项 */
export interface ProtocolServiceItem {
    /** 协议 ID */
    id: number;
    /** 协议名称，如 users/Get */
    name: string;
    /** 类型：api | msg */
    type: string;
    /** 请求类型 id（用于编辑） */
    reqTypeId?: string;
    /** 响应类型 id（用于编辑） */
    resTypeId?: string;
}

/** 类型属性项（用于展示与编辑） */
export interface ProtocolTypePropertyItem {
    id: number;
    name: string;
    /** 类型描述，如 string, number, User[] */
    typeDesc: string;
    /** 可编辑类型：基础类型名或自定义类型 id，用于下拉选择 */
    type: string;
    optional?: boolean;
}

/** 协议类型定义项 */
export interface ProtocolTypeItem {
    type: string;
    extends?: string[];
    properties?: ProtocolTypePropertyItem[];
    /** 是否为自定义类型 */
    isCustom?: boolean;
}

/** 获取游戏协议响应 */
export interface ResGetProtocol extends BaseResponse {
    /** 后端 proto 版本 */
    version: number;
    /** 服务列表（API / Msg） */
    services: ProtocolServiceItem[];
    /** 类型定义（结构体），key 为类型名 */
    types: { [typeName: string]: ProtocolTypeItem };
    /** 按文件路径的源码（从 .ts 文件读取，若有） */
    typeSources?: { [path: string]: string };
    /** 按类型名关联的源码（便于展示注释） */
    typeSourceMap?: { [typeName: string]: string };
}

export const conf = {};
