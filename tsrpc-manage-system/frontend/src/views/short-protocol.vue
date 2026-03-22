<template>
    <div class="protocol-page">
        <div class="container">
            <el-tabs v-model="activeTab" type="border-card">
                <el-tab-pane label="协议列表" name="services">
                    <div class="tab-header">
                        <span>短连接协议 · 协议 ID、名称 · 支持增删改查，点击编辑可修改请求/响应字段</span>
                        <div>
                            <el-button type="primary" size="small" :icon="Refresh" @click="loadProtocol">刷新</el-button>
                            <el-button type="success" size="small" :icon="Plus" @click="openAddProtocol">新增协议</el-button>
                        </div>
                    </div>
                    <el-table :data="servicesDisplayed" border class="table" header-cell-class-name="table-header">
                        <el-table-column prop="id" label="协议 ID" width="100" align="center" />
                        <el-table-column prop="name" label="协议名称" min-width="200" />
                        <el-table-column label="操作" width="160" align="center" fixed="right">
                            <template #default="scope">
                                <el-button type="primary" link size="small" @click="openEditProtocol(scope.row)">编辑</el-button>
                                <el-button type="danger" link size="small" @click="deleteProtocol(scope.row)">删除</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <div class="meta">Proto 版本: {{ version }}</div>

                    <el-drawer
                        v-model="protocolDrawerVisible"
                        :title="editingProtocol ? '编辑协议：' + editingProtocol.name : '编辑协议'"
                        size="560"
                        direction="rtl"
                    >
                        <template v-if="editingProtocol">
                            <div class="drawer-section">
                                <div class="section-title-row">
                                    <span class="section-title">请求结构 {{ editingProtocol.reqTypeId ? `(${editingProtocol.reqTypeId})` : '' }}</span>
                                    <template v-if="editingProtocol.reqTypeId">
                                        <el-button type="danger" link size="small" @click="removeReqBlock">删除请求结构</el-button>
                                    </template>
                                    <template v-else>
                                        <el-button type="primary" link size="small" @click="addReqBlock">添加请求结构</el-button>
                                    </template>
                                </div>
                                <fields-editor
                                    v-if="editingProtocol.reqTypeId"
                                    v-model="editingReqFields"
                                    :type-options="allTypeOptions"
                                />
                            </div>
                            <div class="drawer-section">
                                <div class="section-title-row">
                                    <span class="section-title">响应结构 {{ editingProtocol.resTypeId ? `(${editingProtocol.resTypeId})` : '' }}</span>
                                    <template v-if="editingProtocol.resTypeId">
                                        <el-button type="danger" link size="small" @click="removeResBlock">删除响应结构</el-button>
                                    </template>
                                    <template v-else>
                                        <el-button type="primary" link size="small" @click="addResBlock">添加响应结构</el-button>
                                    </template>
                                </div>
                                <fields-editor
                                    v-if="editingProtocol.resTypeId"
                                    v-model="editingResFields"
                                    :type-options="allTypeOptions"
                                />
                            </div>
                            <div class="drawer-footer">
                                <el-button type="primary" @click="saveProtocolEdit">保存</el-button>
                                <el-button @click="protocolDrawerVisible = false">取消</el-button>
                            </div>
                        </template>
                    </el-drawer>

                    <el-dialog v-model="addProtocolVisible" title="新增协议" width="400" @close="addProtocolForm = { name: '' }">
                        <el-form label-width="80px">
                            <el-form-item label="协议名称">
                                <el-input v-model="addProtocolForm.name" placeholder="如 users/Get" />
                            </el-form-item>
                        </el-form>
                        <template #footer>
                            <el-button @click="addProtocolVisible = false">取消</el-button>
                            <el-button type="primary" @click="confirmAddProtocol">确定</el-button>
                        </template>
                    </el-dialog>
                </el-tab-pane>

                <el-tab-pane label="自定义类型" name="customTypes">
                    <div class="tab-header">
                        <span>模块内复用或供协议字段选择的类型 · 与长连接共用</span>
                        <el-button type="success" size="small" :icon="Plus" @click="openAddCustomType">新增自定义类型</el-button>
                    </div>
                    <el-table :data="customTypeList" border class="table">
                        <el-table-column prop="id" label="类型 ID" min-width="220">
                            <template #default="scope">
                                <code class="type-id">{{ scope.row.id }}</code>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="160" align="center">
                            <template #default="scope">
                                <el-button type="primary" link size="small" @click="openEditCustomType(scope.row)">编辑</el-button>
                                <el-button type="danger" link size="small" @click="deleteCustomType(scope.row.id)">删除</el-button>
                            </template>
                        </el-table-column>
                    </el-table>

                    <el-drawer
                        v-model="customTypeDrawerVisible"
                        :title="editingCustomTypeId ? '编辑类型：' + editingCustomTypeId : '编辑自定义类型'"
                        size="520"
                        direction="rtl"
                    >
                        <template v-if="editingCustomTypeId">
                            <div class="section-title">字段列表（类型可选基础类型或自定义类型）</div>
                            <fields-editor
                                v-model="editingCustomTypeFields"
                                :type-options="allTypeOptions"
                            />
                            <div class="drawer-footer">
                                <el-button type="primary" @click="saveCustomTypeEdit">保存</el-button>
                                <el-button @click="customTypeDrawerVisible = false">取消</el-button>
                            </div>
                        </template>
                    </el-drawer>

                    <el-dialog v-model="addCustomTypeVisible" title="新增自定义类型" width="400" @close="newCustomTypeId = ''">
                        <el-form label-width="80px">
                            <el-form-item label="类型 ID">
                                <el-input v-model="newCustomTypeId" placeholder="如 game/Player 或 db_User" />
                            </el-form-item>
                        </el-form>
                        <template #footer>
                            <el-button @click="addCustomTypeVisible = false">取消</el-button>
                            <el-button type="primary" @click="confirmAddCustomType">确定</el-button>
                        </template>
                    </el-dialog>
                </el-tab-pane>

                <el-tab-pane label="导出 d.ts" name="export">
                    <div class="export-section">
                        <div class="export-desc">将当前协议与自定义类型生成 TypeScript 声明文件并下载。</div>
                        <el-form label-width="120px" class="export-form">
                            <el-form-item label="导出路径/文件名">
                                <el-input v-model="exportFilename" placeholder="例如: protocol.d.ts" clearable />
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" :icon="Download" :loading="exporting" @click="handleExport">导出并下载 d.ts</el-button>
                            </el-form-item>
                        </el-form>
                    </div>
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
</template>

<script setup lang="ts" name="shortProtocol">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Download, Plus } from '@element-plus/icons-vue';
import { client } from '../client';
import FieldsEditor from '../components/protocol/FieldsEditor.vue';

const BASIC_TYPES = ['string', 'number', 'boolean', 'Date', 'Uint8Array', 'any'];

interface ProtocolServiceItem {
    id: number;
    name: string;
    type: string;
    reqTypeId?: string;
    resTypeId?: string;
}

interface ProtocolTypePropertyItem {
    id: number;
    name: string;
    typeDesc: string;
    type: string;
    optional?: boolean;
}

interface ProtocolTypeItem {
    type: string;
    extends?: string[];
    properties?: ProtocolTypePropertyItem[];
    isCustom?: boolean;
}

const activeTab = ref('services');
const version = ref(0);
const services = ref<ProtocolServiceItem[]>([]);
const types = ref<{ [k: string]: ProtocolTypeItem }>({});
const exportFilename = ref('protocol.d.ts');
const exporting = ref(false);

/** 短连接定义：仅展示 api 类型 */
const servicesDisplayed = computed(() =>
    services.value.filter((s) => (s.type || 'api') === 'api')
);

const customTypeList = computed(() => {
    const list: { id: string }[] = [];
    for (const [id, t] of Object.entries(types.value)) {
        if (t.isCustom) list.push({ id });
    }
    return list.sort((a, b) => a.id.localeCompare(b.id));
});

const allTypeOptions = computed(() => {
    const base = BASIC_TYPES.map((t) => ({ label: t, value: t }));
    const baseArr = BASIC_TYPES.map((t) => ({ label: t + '[]', value: t + '[]' }));
    const custom = customTypeList.value.map((r) => ({ label: r.id, value: r.id }));
    const customArr = customTypeList.value.map((r) => ({ label: r.id + '[]', value: r.id + '[]' }));
    return [...base, ...baseArr, ...custom, ...customArr];
});

const protocolDrawerVisible = ref(false);
const editingProtocol = ref<ProtocolServiceItem | null>(null);
const editingReqFields = ref<{ id: number; name: string; type: string; optional?: boolean }[]>([]);
const editingResFields = ref<{ id: number; name: string; type: string; optional?: boolean }[]>([]);

const addProtocolVisible = ref(false);
const addProtocolForm = ref({ name: '' });

const customTypeDrawerVisible = ref(false);
const editingCustomTypeId = ref('');
const editingCustomTypeFields = ref<{ id: number; name: string; type: string; optional?: boolean }[]>([]);
const addCustomTypeVisible = ref(false);
const newCustomTypeId = ref('');

async function loadProtocol() {
    const ret = await client.callApi('protocol/GetProtocol', {});
    if (!ret.isSucc) {
        ElMessage.error(ret.err.message || '获取协议失败');
        return;
    }
    version.value = ret.res.version;
    services.value = ret.res.services || [];
    types.value = JSON.parse(JSON.stringify(ret.res.types || {}));
}

function openEditProtocol(row: ProtocolServiceItem) {
    editingProtocol.value = { ...row };
    const reqId = row.reqTypeId;
    const resId = row.resTypeId;
    editingReqFields.value = reqId ? (types.value[reqId]?.properties || []).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        optional: p.optional,
    })) : [];
    editingResFields.value = resId ? (types.value[resId]?.properties || []).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        optional: p.optional,
    })) : [];
    protocolDrawerVisible.value = true;
}

function inferReqResTypeIds(name: string): { reqTypeId: string; resTypeId: string } {
    const last = name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name;
    return {
        reqTypeId: `${name}/Req${last}`,
        resTypeId: `${name}/Res${last}`,
    };
}

function addReqBlock() {
    if (!editingProtocol.value) return;
    const { reqTypeId } = inferReqResTypeIds(editingProtocol.value.name);
    editingProtocol.value = { ...editingProtocol.value, reqTypeId };
    types.value = { ...types.value, [reqTypeId]: { type: 'Interface', properties: [], isCustom: false } };
    editingReqFields.value = [];
}

function addResBlock() {
    if (!editingProtocol.value) return;
    const { resTypeId } = inferReqResTypeIds(editingProtocol.value.name);
    editingProtocol.value = { ...editingProtocol.value, resTypeId };
    types.value = { ...types.value, [resTypeId]: { type: 'Interface', properties: [], isCustom: false } };
    editingResFields.value = [];
}

function removeReqBlock() {
    if (!editingProtocol.value?.reqTypeId) return;
    const reqId = editingProtocol.value.reqTypeId;
    editingProtocol.value = { ...editingProtocol.value, reqTypeId: undefined };
    editingReqFields.value = [];
    const t = { ...types.value };
    delete t[reqId];
    types.value = t;
}

function removeResBlock() {
    if (!editingProtocol.value?.resTypeId) return;
    const resId = editingProtocol.value.resTypeId;
    editingProtocol.value = { ...editingProtocol.value, resTypeId: undefined };
    editingResFields.value = [];
    const t = { ...types.value };
    delete t[resId];
    types.value = t;
}

function saveProtocolEdit() {
    if (!editingProtocol.value) return;
    const t = { ...types.value };
    const reqId = editingProtocol.value.reqTypeId;
    const resId = editingProtocol.value.resTypeId;
    if (reqId) {
        t[reqId] = {
            ...t[reqId],
            type: 'Interface',
            extends: t[reqId]?.extends,
            isCustom: t[reqId]?.isCustom,
            properties: editingReqFields.value.map((p, i) => ({ ...p, id: p.id ?? i })),
        };
    }
    if (resId) {
        t[resId] = {
            ...t[resId],
            type: 'Interface',
            extends: t[resId]?.extends,
            isCustom: t[resId]?.isCustom,
            properties: editingResFields.value.map((p, i) => ({ ...p, id: p.id ?? i })),
        };
    }
    types.value = t;
    const idx = services.value.findIndex((s) => s.id === editingProtocol.value!.id);
    if (idx >= 0) {
        services.value = services.value.slice();
        services.value[idx] = { ...services.value[idx], ...editingProtocol.value };
    }
    saveToBackend();
    protocolDrawerVisible.value = false;
    editingProtocol.value = null;
}

function deleteProtocol(row: ProtocolServiceItem) {
    ElMessageBox.confirm('确定删除该协议？将同时删除其请求/响应类型定义。', '提示', {
        type: 'warning',
    }).then(async () => {
        services.value = services.value.filter((s) => s.id !== row.id);
        const t = { ...types.value };
        if (row.reqTypeId) delete t[row.reqTypeId];
        if (row.resTypeId) delete t[row.resTypeId];
        types.value = t;
        await saveToBackend();
        ElMessage.success('已删除');
    }).catch(() => {});
}

function openAddProtocol() {
    addProtocolForm.value = { name: '' };
    addProtocolVisible.value = true;
}

function getNextServiceId(): number {
    const ids = services.value.map((s) => s.id);
    let next = 1;
    while (ids.includes(next)) next++;
    return next;
}

function confirmAddProtocol() {
    const name = addProtocolForm.value.name.trim();
    if (!name) {
        ElMessage.warning('请输入协议名称');
        return;
    }
    const id = getNextServiceId();
    const { reqTypeId, resTypeId } = inferReqResTypeIds(name);
    services.value = [...services.value, { id, name, type: 'api', reqTypeId, resTypeId }];
    types.value = {
        ...types.value,
        [reqTypeId]: { type: 'Interface', properties: [], isCustom: false },
        [resTypeId]: { type: 'Interface', properties: [], isCustom: false },
    };
    addProtocolVisible.value = false;
    saveToBackend();
    ElMessage.success('已新增协议');
}

async function saveToBackend() {
    const payload = {
        services: services.value.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            ...(s.reqTypeId !== undefined && { reqTypeId: s.reqTypeId }),
            ...(s.resTypeId !== undefined && { resTypeId: s.resTypeId }),
        })),
        types: {} as { [k: string]: any },
    };
    for (const [id, t] of Object.entries(types.value)) {
        payload.types[id] = {
            extends: t.extends,
            isCustom: t.isCustom,
            properties: (t.properties || []).map((p) => ({
                id: p.id,
                name: p.name,
                type: p.type,
                optional: p.optional,
            })),
        };
    }
    const ret = await client.callApi('protocol/SaveProtocol', payload);
    if (!ret.isSucc) {
        ElMessage.error(ret.err.message || '保存失败');
        return;
    }
    ElMessage.success('保存成功');
}

function openEditCustomType(row: { id: string }) {
    editingCustomTypeId.value = row.id;
    const t = types.value[row.id];
    editingCustomTypeFields.value = (t?.properties || []).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        optional: p.optional,
    }));
    customTypeDrawerVisible.value = true;
}

function saveCustomTypeEdit() {
    if (!editingCustomTypeId.value) return;
    const id = editingCustomTypeId.value;
    types.value = {
        ...types.value,
        [id]: {
            ...types.value[id],
            type: 'Interface',
            properties: editingCustomTypeFields.value.map((p, i) => ({ ...p, id: p.id ?? i })),
            isCustom: true,
        },
    };
    saveToBackend();
    customTypeDrawerVisible.value = false;
    editingCustomTypeId.value = '';
}

function deleteCustomType(typeId: string) {
    ElMessageBox.confirm('确定删除该自定义类型？', '提示', { type: 'warning' }).then(() => {
        const t = { ...types.value };
        delete t[typeId];
        types.value = t;
        saveToBackend();
        ElMessage.success('已删除');
    }).catch(() => {});
}

function openAddCustomType() {
    newCustomTypeId.value = '';
    addCustomTypeVisible.value = true;
}

function confirmAddCustomType() {
    const id = newCustomTypeId.value.trim();
    if (!id) {
        ElMessage.warning('请输入类型 ID');
        return;
    }
    if (types.value[id]) {
        ElMessage.warning('该类型 ID 已存在');
        return;
    }
    types.value = { ...types.value, [id]: { type: 'Interface', properties: [], isCustom: true } };
    addCustomTypeVisible.value = false;
    saveToBackend();
    ElMessage.success('已新增自定义类型');
}

function downloadBlob(blob: Blob, filename: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename.replace(/^.*[\\/]/, '');
    a.click();
    URL.revokeObjectURL(a.href);
}

async function handleExport() {
    exporting.value = true;
    try {
        const ret = await client.callApi('protocol/ExportProtoDts', { filename: exportFilename.value || undefined });
        if (!ret.isSucc) {
            ElMessage.error(ret.err.message || '导出失败');
            return;
        }
        const blob = new Blob([ret.res.content], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, ret.res.suggestedFilename);
        ElMessage.success('已下载: ' + ret.res.suggestedFilename);
    } finally {
        exporting.value = false;
    }
}

onMounted(() => loadProtocol());
</script>

<style scoped>
.protocol-page {
    padding: 20px;
}
.tab-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}
.meta {
    margin-top: 12px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}
.type-id {
    font-size: 12px;
    background: var(--el-fill-color-light);
    padding: 2px 6px;
    border-radius: 4px;
}
.drawer-section {
    margin-bottom: 20px;
}
.section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 8px;
}
.section-title {
    font-weight: 600;
    color: var(--el-text-color-primary);
}
.section-title-row .section-title {
    margin-bottom: 0;
}
.drawer-footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);
}
.export-section {
    max-width: 560px;
}
.export-desc {
    color: var(--el-text-color-regular);
    margin-bottom: 16px;
}
</style>
