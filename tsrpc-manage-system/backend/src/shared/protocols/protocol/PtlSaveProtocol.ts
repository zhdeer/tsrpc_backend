import { BaseRequest, BaseResponse } from "../base";

/** 可编辑的协议服务项（请求/响应类型 id 可选，不必成对存在） */
export interface EditableServiceItem {
    id: number;
    name: string;
    type: string;
    reqTypeId?: string;
    resTypeId?: string;
}

/** 可编辑的字段项（类型为字符串：基础类型名或自定义类型 id） */
export interface EditablePropertyItem {
    id: number;
    name: string;
    /** 基础类型 string|number|boolean|Date|Uint8Array|any 或自定义类型 id */
    type: string;
    optional?: boolean;
}

/** 可编辑的类型定义 */
export interface EditableTypeItem {
    extends?: string[];
    properties?: EditablePropertyItem[];
    /** 是否为自定义类型（用于「自定义类型」页签） */
    isCustom?: boolean;
}

/** 保存协议请求 */
export interface ReqSaveProtocol extends BaseRequest {
    services: EditableServiceItem[];
    types: { [typeId: string]: EditableTypeItem };
}

/** 保存协议响应 */
export interface ResSaveProtocol extends BaseResponse {
    ok: boolean;
}

export const conf = {};
