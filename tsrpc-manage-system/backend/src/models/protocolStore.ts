import * as path from "path";
import * as fs from "fs";

export interface EditablePropertyItem {
    id: number;
    name: string;
    type: string;
    optional?: boolean;
}

export interface EditableTypeItem {
    extends?: string[];
    properties?: EditablePropertyItem[];
    isCustom?: boolean;
}

export interface EditableServiceItem {
    id: number;
    name: string;
    type: string;
    reqTypeId?: string;
    resTypeId?: string;
}

export interface ProtocolStore {
    version: number;
    services: EditableServiceItem[];
    types: { [typeId: string]: EditableTypeItem };
}

const STORE_FILE = "protocol-edit.json";

export function getStorePath(): string {
    const dir = path.resolve(__dirname, "../../data");
    return path.join(dir, STORE_FILE);
}

export function readStore(): ProtocolStore | null {
    const filePath = getStorePath();
    if (!fs.existsSync(filePath)) return null;
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const store = JSON.parse(raw) as ProtocolStore;
        return migrateStoreTypeIds(store);
    } catch {
        return null;
    }
}

/** 迁移存储：把 xxx/PtlYyy/ReqYyy 改为 xxx/ReqYyy（中间去掉 Ptl 层），并写回文件 */
function migrateStoreTypeIds(store: ProtocolStore): ProtocolStore {
    let changed = false;
    const oldToNew: Record<string, string> = {};
    for (const key of Object.keys(store.types)) {
        const newKey = normalizeTypeId(key);
        if (newKey !== key) {
            oldToNew[key] = newKey;
            changed = true;
        }
    }
    for (const s of store.services) {
        if (s.reqTypeId && normalizeTypeId(s.reqTypeId) !== s.reqTypeId) {
            (s as any).reqTypeId = normalizeTypeId(s.reqTypeId);
            changed = true;
        }
        if (s.resTypeId && normalizeTypeId(s.resTypeId) !== s.resTypeId) {
            (s as any).resTypeId = normalizeTypeId(s.resTypeId);
            changed = true;
        }
    }
    if (!changed) return store;
    const newTypes: { [typeId: string]: EditableTypeItem } = {};
    for (const [key, value] of Object.entries(store.types)) {
        const newKey = oldToNew[key] ?? key;
        const item = { ...value };
        if (item.properties) {
            item.properties = item.properties.map((p) => ({
                ...p,
                type: oldToNew[p.type] ?? normalizeTypeId(p.type),
            }));
        }
        newTypes[newKey] = item;
    }
    const migrated: ProtocolStore = { ...store, types: newTypes };
    writeStore(migrated);
    return migrated;
}

export function writeStore(data: ProtocolStore): void {
    const filePath = getStorePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/** 将旧格式 typeId（含中间 Ptl 层）转为新格式：name/ReqX 或 name/ResX */
export function normalizeTypeId(typeId: string): string {
    const match = typeId.match(/^(.+)\/Ptl[A-Za-z0-9_]+\/(Req|Res)([A-Za-z0-9_]+)$/);
    if (!match) return typeId;
    const [, prefix, reqOrRes, last] = match;
    return `${prefix}/${reqOrRes}${last}`;
}

/** 从服务名推断 req/res 类型 id（格式：name/ReqX、name/ResX，中间不加 Ptl） */
export function serviceNameToTypeIds(serviceName: string): { reqTypeId: string; resTypeId: string } {
    const last = serviceName.includes("/") ? serviceName.slice(serviceName.lastIndexOf("/") + 1) : serviceName;
    return {
        reqTypeId: `${serviceName}/Req${last}`,
        resTypeId: `${serviceName}/Res${last}`,
    };
}
