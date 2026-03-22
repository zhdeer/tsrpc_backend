import { ApiCall } from "tsrpc";
import type { ReqSaveProtocol, ResSaveProtocol } from "../../shared/protocols/protocol/PtlSaveProtocol";
import { readStore, writeStore } from "../../models/protocolStore";

export default async function (call: ApiCall<ReqSaveProtocol, ResSaveProtocol>) {
    const { services, types } = call.req;
    if (!Array.isArray(services) || typeof types !== "object" || types === null) {
        return call.error("参数无效");
    }
    const version = (readStore()?.version ?? 0) + 1;
    const store = {
        version,
        services: services.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type || "api",
            reqTypeId: s.reqTypeId,
            resTypeId: s.resTypeId,
        })),
        types: {} as { [k: string]: any },
    };
    for (const [id, t] of Object.entries(types)) {
        store.types[id] = {
            extends: t.extends,
            isCustom: !!t.isCustom,
            properties: (t.properties || []).map((p) => ({
                id: p.id,
                name: p.name,
                type: p.type || "any",
                optional: !!p.optional,
            })),
        };
    }
    writeStore(store);
    return call.succ({ ok: true });
}
