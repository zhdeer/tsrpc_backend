<template>
    <div class="server-user-page">
        <div class="page-content">
            <!-- 服务器配置 -->
            <template v-if="currentTab === 'serverConfig'">
                    <div class="tab-header">
                        <span>在此配置游戏服列表，用户页签与协议调试页签中将从此选择服务器</span>
                        <el-button type="primary" size="small" :icon="Plus" @click="openServerDialog()">新增服务器</el-button>
                    </div>
                    <el-table :data="serverList" border class="table">
                        <el-table-column prop="name" label="名称" min-width="120" />
                        <el-table-column prop="baseUrl" label="地址" min-width="220" />
                        <el-table-column label="操作" width="140" align="center">
                            <template #default="scope">
                                <el-button type="primary" link size="small" @click="openServerDialog(scope.row)">编辑</el-button>
                                <el-button type="danger" link size="small" @click="removeServer(scope.row.id)">删除</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-dialog v-model="serverDialogVisible" :title="editingServer ? '编辑服务器' : '新增服务器'" width="400" @close="editingServer = null">
                        <el-form :model="serverForm" label-width="80px">
                            <el-form-item label="名称">
                                <el-input v-model="serverForm.name" placeholder="如：测试服" />
                            </el-form-item>
                            <el-form-item label="地址">
                                <el-input v-model="serverForm.baseUrl" placeholder="如：http://127.0.0.1:3001" />
                            </el-form-item>
                        </el-form>
                        <template #footer>
                            <el-button @click="serverDialogVisible = false">取消</el-button>
                            <el-button type="primary" @click="saveServer">确定</el-button>
                        </template>
                    </el-dialog>
            </template>

            <!-- 用户 -->
            <template v-else-if="currentTab === 'user'">
                    <el-card shadow="hover">
                        <template #header><span>查询条件</span></template>
                        <el-form :model="userQueryForm" inline>
                            <el-form-item label="选择服务器">
                                <el-select v-model="userQueryForm.serverId" placeholder="请先到「服务器配置」添加服务器" clearable style="width: 200px">
                                    <el-option v-for="s in serverList" :key="s.id" :label="s.name" :value="s.id" />
                                </el-select>
                            </el-form-item>
                            <el-form-item label="用户ID/用户名">
                                <el-input v-model="userQueryForm.userId" placeholder="输入用户ID或用户名" clearable style="width: 180px" />
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" :icon="Search" :loading="querying" @click="queryUser">查询用户</el-button>
                            </el-form-item>
                        </el-form>
                    </el-card>
                    <el-card v-if="userInfo !== null" class="user-info-card" shadow="hover">
                        <template #header><span>用户信息</span></template>
                        <el-descriptions v-if="userInfo && Object.keys(userInfo).length" :column="2" border>
                            <el-descriptions-item v-for="(v, k) in userInfo" :key="k" :label="String(k)">
                                {{ typeof v === 'object' ? JSON.stringify(v) : v }}
                            </el-descriptions-item>
                        </el-descriptions>
                        <div v-else class="user-info-empty">暂无数据（需对接游戏服用户查询接口）</div>
                        <el-divider />
                        <div class="user-ext-desc">后续可扩展：道具数量修改、GM 操作等</div>
                    </el-card>
            </template>

            <!-- 协议调试 -->
            <template v-else-if="currentTab === 'protocolDebug'">
                    <el-card shadow="hover">
                        <el-form label-width="100px" class="debug-form">
                            <el-form-item label="选择服务器">
                                <el-select v-model="debugForm.serverId" placeholder="请先到「服务器配置」添加服务器" clearable style="width: 100%" @change="debugResponse = null">
                                    <el-option v-for="s in serverList" :key="s.id" :label="s.name" :value="s.id" />
                                </el-select>
                            </el-form-item>
                            <el-form-item label="调试用户">
                                <el-input v-model="debugForm.userId" placeholder="输入用户ID或用户名（调试时作为上下文）" clearable />
                            </el-form-item>
                            <el-form-item label="选择协议">
                                <el-select
                                    v-model="debugForm.protocolName"
                                    :placeholder="isShortProtocolDebug ? '从短连接协议定义中选择' : '从长连接协议定义中选择'"
                                    filterable
                                    style="width: 100%"
                                    @change="onProtocolChange"
                                >
                                    <el-option v-for="s in protocolListDisplayed" :key="s.id" :label="s.name" :value="s.name" />
                                </el-select>
                            </el-form-item>
                            <template v-if="reqFields.length">
                                <el-divider content-position="left">请求字段（按协议定义填写）</el-divider>
                                <el-form-item v-for="f in reqFields" :key="f.name" :label="f.name">
                                    <el-input
                                        v-if="f.type === 'string' || f.type === 'any' || f.type.includes('[]') || !['number','boolean'].includes(f.type)"
                                        v-model="debugReqValues[f.name]"
                                        :placeholder="f.optional ? '可选' : ''"
                                        clearable
                                    />
                                    <el-input-number
                                        v-else-if="f.type === 'number'"
                                        v-model="debugReqValues[f.name]"
                                        :placeholder="f.optional ? '可选' : ''"
                                        style="width: 100%"
                                    />
                                    <el-switch v-else-if="f.type === 'boolean'" v-model="debugReqValues[f.name]" />
                                    <el-input v-else v-model="debugReqValues[f.name]" :placeholder="f.optional ? '可选' : ''" clearable />
                                </el-form-item>
                            </template>
                            <el-form-item>
                                <el-button type="primary" :icon="Promotion" :loading="sending" @click="sendProtocol">发送请求</el-button>
                            </el-form-item>
                        </el-form>

                        <div v-if="resFields.length" class="res-structure">
                            <div class="res-structure-label">返回结构（协议定义）</div>
                            <el-descriptions :column="1" border size="small">
                                <el-descriptions-item v-for="f in resFields" :key="f.name" :label="f.name">
                                    <span class="type-tag">{{ f.type }}</span>
                                    <el-tag v-if="f.optional" size="small" type="info">可选</el-tag>
                                </el-descriptions-item>
                            </el-descriptions>
                        </div>

                        <div v-if="debugResponse !== null" class="debug-response">
                            <div class="debug-response-label">实际响应</div>
                            <pre class="debug-response-body">{{ debugResponse }}</pre>
                        </div>
                    </el-card>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts" name="serverUser">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Promotion, Plus } from '@element-plus/icons-vue';
import { client } from '../client';

const SERVER_STORAGE_KEY = 'tsrpc_game_servers';

const route = useRoute();
const currentTab = computed(() => {
    if (route.path === '/server-config') return 'serverConfig';
    if (route.path === '/user') return 'user';
    if (route.path === '/protocol-debug' || route.path === '/short-protocol-debug') return 'protocolDebug';
    return 'serverConfig';
});

/** 协议调试页：长连接(/protocol-debug) 仅 msg，短连接(/short-protocol-debug) 仅 api */
const isShortProtocolDebug = computed(() => route.path === '/short-protocol-debug');

interface ServerItem {
    id: string;
    name: string;
    baseUrl: string;
}

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
    type: string;
    optional?: boolean;
}

interface ProtocolTypeItem {
    type: string;
    properties?: ProtocolTypePropertyItem[];
}


// ---------- 服务器配置 ----------
function loadServerList(): ServerItem[] {
    try {
        const raw = localStorage.getItem(SERVER_STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

const serverList = ref<ServerItem[]>(loadServerList());

function saveServerList(list: ServerItem[]) {
    localStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify(list));
    serverList.value = list;
}

const serverDialogVisible = ref(false);
const editingServer = ref<ServerItem | null>(null);
const serverForm = reactive({ name: '', baseUrl: '' });

function openServerDialog(row?: ServerItem) {
    if (row) {
        editingServer.value = row;
        serverForm.name = row.name;
        serverForm.baseUrl = row.baseUrl;
    } else {
        editingServer.value = null;
        serverForm.name = '';
        serverForm.baseUrl = '';
    }
    serverDialogVisible.value = true;
}

function saveServer() {
    const name = serverForm.name.trim();
    const baseUrl = serverForm.baseUrl.trim();
    if (!name || !baseUrl) {
        ElMessage.warning('请填写名称和地址');
        return;
    }
    const list = [...serverList.value];
    if (editingServer.value) {
        const idx = list.findIndex((s) => s.id === editingServer.value!.id);
        if (idx >= 0) {
            list[idx] = { ...list[idx], name, baseUrl };
        }
    } else {
        list.push({
            id: 's_' + Date.now(),
            name,
            baseUrl,
        });
    }
    saveServerList(list);
    serverDialogVisible.value = false;
    ElMessage.success('已保存');
}

function removeServer(id: string) {
    ElMessageBox.confirm('确定删除该服务器配置？', '提示', { type: 'warning' }).then(() => {
        saveServerList(serverList.value.filter((s) => s.id !== id));
        ElMessage.success('已删除');
    }).catch(() => {});
}

// ---------- 用户页签 ----------
const userQueryForm = reactive({
    serverId: '',
    userId: '',
});

const querying = ref(false);
const userInfo = ref<Record<string, unknown> | null>(null);

function getServerBaseUrl(serverId: string): string {
    const s = serverList.value.find((x) => x.id === serverId);
    return s ? s.baseUrl.replace(/\/$/, '') : '';
}

async function queryUser() {
    const base = getServerBaseUrl(userQueryForm.serverId);
    if (!base) {
        ElMessage.warning('请先选择服务器（或在服务器配置中添加）');
        return;
    }
    if (!userQueryForm.userId.trim()) {
        ElMessage.warning('请填写用户ID或用户名');
        return;
    }
    querying.value = true;
    userInfo.value = null;
    try {
        const url = `${base}/api/user/info?uid=${encodeURIComponent(userQueryForm.userId)}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data) {
            userInfo.value = typeof data === 'object' ? data : { data };
        } else {
            userInfo.value = {};
            ElMessage.info('游戏服暂无用户查询接口或返回格式不符');
        }
    } catch (e: any) {
        userInfo.value = {};
        ElMessage.warning(e?.message || '请求失败，请确认服务器地址可访问');
    } finally {
        querying.value = false;
    }
}

// ---------- 协议调试：协议列表与类型定义 ----------
const protocolList = ref<ProtocolServiceItem[]>([]);
const protocolTypes = ref<Record<string, ProtocolTypeItem>>({});

async function loadProtocol() {
    const ret = await client.callApi('protocol/GetProtocol', {});
    if (!ret.isSucc || !ret.res.services) return;
    protocolList.value = (ret.res.services || []) as ProtocolServiceItem[];
    protocolTypes.value = ret.res.types || {};
}

const protocolListDisplayed = computed(() =>
    protocolList.value.filter((s) =>
        isShortProtocolDebug.value ? (s.type || 'api') === 'api' : (s.type || 'api') === 'msg'
    )
);

const debugForm = reactive({
    serverId: '',
    userId: '',
    protocolName: '',
});

const debugReqValues = reactive<Record<string, any>>({});
const sending = ref(false);
const debugResponse = ref<string | null>(null);

const currentProtocol = computed(() =>
    protocolList.value.find((s) => s.name === debugForm.protocolName)
);

const reqFields = computed(() => {
    const s = currentProtocol.value;
    if (!s?.reqTypeId) return [];
    const t = protocolTypes.value[s.reqTypeId];
    return t?.properties || [];
});

const resFields = computed(() => {
    const s = currentProtocol.value;
    if (!s?.resTypeId) return [];
    const t = protocolTypes.value[s.resTypeId];
    return t?.properties || [];
});

function onProtocolChange() {
    debugResponse.value = null;
    const fields = reqFields.value;
    const next: Record<string, any> = {};
    fields.forEach((f) => {
        next[f.name] = debugReqValues[f.name] ?? (f.type === 'number' ? undefined : f.type === 'boolean' ? false : '');
    });
    Object.keys(debugReqValues).forEach((k) => delete debugReqValues[k]);
    Object.assign(debugReqValues, next);
}

function buildRequestBody(): Record<string, any> {
    const body: Record<string, any> = {};
    reqFields.value.forEach((f) => {
        let v = debugReqValues[f.name];
        if (v === '' || v === undefined) {
            if (f.optional) return;
            v = f.type === 'number' ? 0 : f.type === 'boolean' ? false : '';
        }
        if (f.type === 'number') v = Number(v);
        if (f.type === 'boolean') v = !!v;
        body[f.name] = v;
    });
    return body;
}

async function sendProtocol() {
    const base = getServerBaseUrl(debugForm.serverId);
    if (!base) {
        ElMessage.warning('请先选择服务器');
        return;
    }
    if (!debugForm.protocolName) {
        ElMessage.warning('请选择要调试的协议');
        return;
    }
    const body = buildRequestBody();
    sending.value = true;
    debugResponse.value = null;
    try {
        const path = `/api/${debugForm.protocolName}`;
        const res = await fetch(base + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }
        debugResponse.value = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
        if (!res.ok) ElMessage.warning('请求返回非 2xx，请查看下方响应');
    } catch (e: any) {
        debugResponse.value = `请求异常: ${e?.message || String(e)}`;
        ElMessage.error('发送失败');
    } finally {
        sending.value = false;
    }
}

onMounted(() => loadProtocol());
</script>

<style scoped>
.server-user-page {
    padding: 20px;
    min-height: 400px;
}
.page-content {
    background: #fff;
    border-radius: 4px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.tab-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}
.user-info-card,
.user-info-empty {
    margin-top: 16px;
}
.user-info-empty {
    color: var(--el-text-color-secondary);
    padding: 16px 0;
}
.user-ext-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}
.res-structure {
    margin-top: 16px;
    padding: 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 4px;
}
.res-structure-label {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--el-text-color-primary);
}
.type-tag {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-right: 8px;
}
.debug-response {
    margin-top: 16px;
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
}
.debug-response-label {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--el-text-color-primary);
}
.debug-response-body {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 12px;
    font-family: ui-monospace, monospace;
}
.debug-form {
    max-width: 560px;
}
</style>
