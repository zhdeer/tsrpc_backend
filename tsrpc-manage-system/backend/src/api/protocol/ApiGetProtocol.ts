import { ApiCall } from "tsrpc";
import { serviceProto } from "../../shared/protocols/serviceProto";
import type { ReqGetProtocol, ResGetProtocol, ProtocolServiceItem, ProtocolTypeItem, ProtocolTypePropertyItem } from "../../shared/protocols/protocol/PtlGetProtocol";
import * as path from "path";
import * as fs from "fs";
import { readStore, serviceNameToTypeIds } from "../../models/protocolStore";

type ProtoTypeSchema = {
    type: string;
    target?: string;
    extends?: { id: number; type: ProtoTypeSchema }[];
    properties?: { id: number; name: string; optional?: boolean; type: ProtoTypeSchema }[];
    elementType?: ProtoTypeSchema;
    members?: ProtoTypeSchema[];
    keys?: string[];
    arrayType?: string;
};

/** 将 proto 类型 schema 转为可编辑类型 id（基础类型名或自定义类型 id） */
function typeSchemaToTypeId(schema: ProtoTypeSchema, typeDefs: Record<string, any>): string {
    if (!schema || !schema.type) return "any";
    switch (schema.type) {
        case "String": return "string";
        case "Number": return "number";
        case "Boolean": return "boolean";
        case "Date": return "Date";
        case "Buffer": return schema.arrayType === "Uint8Array" ? "Uint8Array" : "any";
        case "Any": return "any";
        case "Reference": return schema.target || "any";
        case "Array": {
            const elem = schema.elementType ? typeSchemaToTypeId(schema.elementType, typeDefs) : "any";
            return elem + "[]";
        }
        default: return "any";
    }
}

/** 将 proto 类型 schema 转为可读描述 */
function typeSchemaToDesc(schema: ProtoTypeSchema, types: Record<string, { type: string; properties?: any[]; extends?: any[] }>): string {
    if (!schema || !schema.type) return "unknown";
    switch (schema.type) {
        case "String": return "string";
        case "Number": return "number";
        case "Boolean": return "boolean";
        case "Date": return "Date";
        case "Buffer": return schema.arrayType === "Uint8Array" ? "Uint8Array" : "Buffer";
        case "Any": return "any";
        case "Reference":
            return (schema.target || "unknown").split("/").pop() || "unknown";
        case "Array":
            const elem = schema.elementType ? typeSchemaToDesc(schema.elementType, types) : "any";
            return elem + "[]";
        case "Interface":
            return "object";
        case "Omit":
        case "Pick":
        case "Partial":
            const ref = (schema as any).target?.target;
            return ref ? typeSchemaToDesc({ type: "Reference", target: ref }, types) : "object";
        case "Intersection":
            return (schema.members || []).map((m: ProtoTypeSchema) => typeSchemaToDesc(m, types)).join(" & ");
        default:
            return schema.type;
    }
}

/** 解析一个 type 的 properties 为展示列表 */
function parseTypeItem(typeName: string, typeDef: any, types: Record<string, any>): ProtocolTypeItem {
    const item: ProtocolTypeItem = {
        type: typeDef.type || "Interface",
    };
    if (typeDef.extends && typeDef.extends.length) {
        item.extends = typeDef.extends.map((e: any) => {
            const t = e.type;
            if (t && t.type === "Reference" && t.target) return t.target;
            return "?";
        });
    }
    if (typeDef.properties && typeDef.properties.length) {
        item.properties = typeDef.properties.map((p: any) => {
            const prop: ProtocolTypePropertyItem = {
                id: p.id,
                name: p.name,
                typeDesc: typeSchemaToDesc(p.type || {}, types),
                type: typeSchemaToTypeId(p.type || {}, types),
                optional: !!p.optional,
            };
            return prop;
        });
    }
    const lastPart = typeName.split("/").pop() || "";
    item.isCustom = !/^Req[A-Z]/.test(lastPart) && !/^Res[A-Z]/.test(lastPart);
    return item;
}

/** 从存储的 type 字符串生成 typeDesc（用于展示） */
function storedTypeToDesc(t: string, typeIds: string[]): string {
    if (t.endsWith("[]")) return storedTypeToDesc(t.slice(0, -2), typeIds) + "[]";
    if (["string", "number", "boolean", "Date", "Uint8Array", "any"].includes(t)) return t;
    const name = typeIds.includes(t) ? t.split("/").pop() || t : t;
    return name;
}

export default async function (call: ApiCall<ReqGetProtocol, ResGetProtocol>) {
    const store = readStore();
    const typeIds = store ? Object.keys(store.types) : [];

    if (store) {
        const services: ProtocolServiceItem[] = store.services.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type || "api",
            reqTypeId: s.reqTypeId,
            resTypeId: s.resTypeId,
        }));
        const types: Record<string, ProtocolTypeItem> = {};
        for (const [typeName, typeDef] of Object.entries(store.types)) {
            const item: ProtocolTypeItem = {
                type: "Interface",
                extends: typeDef.extends,
                isCustom: !!typeDef.isCustom,
                properties: (typeDef.properties || []).map((p) => ({
                    id: p.id,
                    name: p.name,
                    typeDesc: storedTypeToDesc(p.type, typeIds),
                    type: p.type,
                    optional: !!p.optional,
                })),
            };
            types[typeName] = item;
        }
        return call.succ({
            version: store.version,
            services,
            types,
        });
    }

    const proto = (serviceProto as any);
    const version = proto.version ?? 0;
    const typeDefs = proto.types || {};
    const services: ProtocolServiceItem[] = (proto.services || []).map((s: any) => {
        const { reqTypeId, resTypeId } = serviceNameToTypeIds(s.name);
        return {
            id: s.id,
            name: s.name,
            type: s.type || "api",
            reqTypeId,
            resTypeId,
        };
    });

    const types: Record<string, ProtocolTypeItem> = {};
    for (const [typeName, typeDef] of Object.entries(typeDefs)) {
        types[typeName] = parseTypeItem(typeName, typeDef as any, typeDefs);
    }

    // 无存储时读取源码（有存储时不再读）
    const typeSources: { [path: string]: string } = {};
    const typeSourceMap: { [typeName: string]: string } = {};
    const protocolsDir = path.resolve(__dirname, "../../shared/protocols");
    try {
        const fileContents: { rel: string; content: string }[] = [];
        const walk = (dir: string) => {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
                const full = path.join(dir, e.name);
                if (e.isDirectory()) walk(full);
                else if (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) {
                    const rel = path.relative(protocolsDir, full).replace(/\\/g, "/");
                    const content = fs.readFileSync(full, "utf-8");
                    fileContents.push({ rel, content });
                    typeSources[rel] = content;
                }
            }
        };
        walk(protocolsDir);
        for (const typeName of Object.keys(types)) {
            const parts = typeName.split("/");
            if (parts.length >= 2) {
                const candidate = parts.slice(0, -1).join("/") + ".ts";
                const found = fileContents.find((f) => f.rel === candidate);
                if (found) typeSourceMap[typeName] = found.content;
            }
        }
    } catch (_) {}

    return call.succ({
        version,
        services,
        types,
        typeSources: Object.keys(typeSources).length ? typeSources : undefined,
        typeSourceMap: Object.keys(typeSourceMap).length ? typeSourceMap : undefined,
    });
}
