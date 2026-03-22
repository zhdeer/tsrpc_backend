import { BaseRequest, BaseResponse } from "../base";

/** 导出 d.ts 请求 */
export interface ReqExportProtoDts extends BaseRequest {
    /** 自定义导出文件名（含 .d.ts 或仅名称），用于下载时的文件名 */
    filename?: string;
}

/** 导出 d.ts 响应 */
export interface ResExportProtoDts extends BaseResponse {
    /** 生成的 d.ts 文件内容 */
    content: string;
    /** 建议的文件名 */
    suggestedFilename: string;
}

export const conf = {};
