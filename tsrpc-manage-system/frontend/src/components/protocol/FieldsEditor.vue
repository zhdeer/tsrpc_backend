<template>
    <div class="fields-editor">
        <div class="toolbar">
            <el-button type="primary" size="small" :icon="Plus" @click="addField">添加字段</el-button>
        </div>
        <el-table :data="modelValue" border size="small" class="fields-table">
            <el-table-column label="类型" width="200" align="center">
                <template #default="scope">
                    <el-select
                        v-model="scope.row.type"
                        placeholder="类型"
                        size="small"
                        filterable
                        style="width:100%"
                    >
                        <el-option
                            v-for="opt in typeOptions"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                        />
                    </el-select>
                </template>
            </el-table-column>
            <el-table-column label="字段名" min-width="160">
                <template #default="scope">
                    <el-input v-model="scope.row.name" size="small" placeholder="字段名" />
                </template>
            </el-table-column>
            <el-table-column label="可选" width="70" align="center">
                <template #default="scope">
                    <el-checkbox v-model="scope.row.optional" />
                </template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center">
                <template #default="scope">
                    <el-button type="danger" link size="small" :icon="Delete" @click="removeField(scope.$index)" />
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup lang="ts">
import { Plus, Delete } from '@element-plus/icons-vue';

interface FieldItem {
    id: number;
    name: string;
    type: string;
    optional?: boolean;
}

const props = defineProps<{
    modelValue: FieldItem[];
    typeOptions: { label: string; value: string }[];
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: FieldItem[]): void;
}>();

function addField() {
    const list = [...(props.modelValue || [])];
    const nextId = list.length ? Math.max(...list.map((f) => f.id), 0) + 1 : 0;
    list.push({ id: nextId, name: '', type: 'any', optional: false });
    emit('update:modelValue', list);
}

function removeField(index: number) {
    const list = [...(props.modelValue || [])];
    list.splice(index, 1);
    emit('update:modelValue', list);
}
</script>

<style scoped>
.fields-editor {
    margin-bottom: 12px;
}
.toolbar {
    margin-bottom: 8px;
}
.fields-table {
    width: 100%;
}
</style>
