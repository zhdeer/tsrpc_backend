import { ApiCall } from "tsrpc";
import { serviceProto } from "../../shared/protocols/serviceProto";
import type { ReqExportProtoDts, ResExportProtoDts } from "../../shared/protocols/protocol/PtlExportProtoDts";
import { readStore } from "../../models/protocolStore";

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

/** 将 proto 类型转为 TypeScript 类型字符串 */
function schemaToTsType(schema: ProtoTypeSchema, types: Record<string, any>, typeNames: Set<string>): string {
    if (!schema || !schema.type) return "any";
    switch (schema.type) {
        case "String": return "string";
        case "Number": return "number";
        case "Boolean": return "boolean";
        case "Date": return "Date";
        case "Buffer": return schema.arrayType === "Uint8Array" ? "Uint8Array" : "Buffer";
        case "Any": return "any";
        case "Reference": {
            const target = schema.target || "";
            const name = target.replace(/\//g, "_").replace(/\?/g, "_");
            return name || "any";
        }
        case "Array": {
            const elem = schema.elementType ? schemaToTsType(schema.elementType, types, typeNames) : "any";
            return elem + "[]";
        }
        case "Interface": return "object";
        case "Omit": {
            const ref = (schema as any).target?.target;
            if (ref) return schemaToTsType({ type: "Reference", target: ref }, types, typeNames);
            return "object";
        }
        case "Pick": {
            const ref = (schema as any).target?.target;
            if (ref) return schemaToTsType({ type: "Reference", target: ref }, types, typeNames);
            return "object";
        }
        case "Partial": {
            const inner = (schema as any).target;
            if (inner) return "Partial<" + schemaToTsType(inner, types, typeNames) + ">";
            return "object";
        }
        case "Intersection": {
            const members = (schema.members || []).map((m: ProtoTypeSchema) => schemaToTsType(m, types, typeNames));
            return members.join(" & ");
        }
        default:
            return "any";
    }
}

/** 生成 d.ts 内容 */
function generateDts(proto: any): string {
    const types = proto.types || {};
    const lines: string[] = [
        "/**",
        " * 由 TSRPC 管理后台导出的协议类型定义",
        " * 来源: serviceProto",
        " */",
        "",
    ];

    const typeNames = new Set<string>();
    for (const name of Object.keys(types)) {
        const safe = name.replace(/\//g, "_").replace(/\?/g, "_");
        typeNames.add(safe);
    }

    for (const [typeName, typeDef] of Object.entries(types)) {
        const def = typeDef as any;
        const interfaceName = typeName.replace(/\//g, "_").replace(/\?/g, "_");
        if (def.type !== "Interface") continue;

        const extendParts: string[] = [];
        if (def.extends && def.extends.length) {
            for (const e of def.extends) {
                const t = e.type;
                if (t && t.type === "Reference" && t.target) {
                    extendParts.push(t.target.replace(/\//g, "_").replace(/\?/g, "_"));
                }
            }
        }

        const decl = extendParts.length
            ? `export interface ${interfaceName} extends ${extendParts.join(", ")} `
            : `export interface ${interfaceName} `;
        lines.push(decl + "{");

        if (def.properties && def.properties.length) {
            for (const p of def.properties) {
                const opt = p.optional ? "?" : "";
                const tsType = schemaToTsType(p.type || {}, types, typeNames);
                lines.push(`    ${p.name}${opt}: ${tsType};`);
            }
        }

        lines.push("}");
        lines.push("");
    }

    return lines.join("\n");
}

/** 从存储格式生成 d.ts */
function generateDtsFromStore(store: { types: { [id: string]: { extends?: string[]; properties?: { name: string; type: string; optional?: boolean }[] } } }): string {
    const lines: string[] = [
        "/**",
        " * 由 TSRPC 管理后台导出的协议类型定义（编辑后）",
        " */",
        "",
    ];
    const types = store.types || {};
    for (const [typeName, typeDef] of Object.entries(types)) {
        const def = typeDef as any;
        const interfaceName = typeName.replace(/\//g, "_").replace(/\?/g, "_");
        const extendParts: string[] = (def.extends || []).map((e: string) => e.replace(/\//g, "_").replace(/\?/g, "_"));
        const decl = extendParts.length
            ? `export interface ${interfaceName} extends ${extendParts.join(", ")} `
            : `export interface ${interfaceName} `;
        lines.push(decl + "{");
        for (const p of def.properties || []) {
            const opt = p.optional ? "?" : "";
            let tsType = p.type;
            if (tsType.endsWith("[]")) {
                const inner = tsType.slice(0, -2);
                tsType = (["string", "number", "boolean", "Date", "Uint8Array", "any"].includes(inner) ? inner : inner.replace(/\//g, "_").replace(/\?/g, "_")) + "[]";
            } else if (!["string", "number", "boolean", "Date", "Uint8Array", "any"].includes(tsType)) {
                tsType = tsType.replace(/\//g, "_").replace(/\?/g, "_");
            }
            lines.push(`    ${p.name}${opt}: ${tsType};`);
        }
        lines.push("}");
        lines.push("");
    }
    return lines.join("\n");
}

export default async function (call: ApiCall<ReqExportProtoDts, ResExportProtoDts>) {
    const store = readStore();
    const content = store
        ? generateDtsFromStore(store)
        : generateDts(serviceProto as any);
    const suggestedFilename = (call.req.filename || "protocol.d.ts").replace(/\.d\.ts$/i, "") + ".d.ts";
    return call.succ({ content, suggestedFilename });
}
