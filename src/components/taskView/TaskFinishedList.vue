<template>
    <div>
        <div v-if="!personLevel" style="margin-bottom: 10px">
            <el-select v-model="selectDoctor"
                       placeholder="选择分配医生"
                       @change="changeDoctId"
            >
                <el-option
                        v-for="item in doctorOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                        :id="item.id"
                >
                </el-option>
            </el-select>
            <el-button type="primary" @click="getResolvedOther">查询</el-button>
        </div>
        <p style="margin-bottom: 20px">未完成数:<span style="color: #e58927;margin: 0 10px;">{{unResolvedNum}}</span></p>
        <el-table
                :data="taskFinishedData"
                v-loading="loading"
                border
                style="width: 783px;margin-bottom: 20px;"
        >
            <el-table-column
                    type="index"
                    width="160">
            </el-table-column>
            <el-table-column
                    prop="id"
                    width="240"
                    label="工单编号">
            </el-table-column>
            <el-table-column
                    prop="updateTime"
                    width="240"
                    label="更新日期">
            </el-table-column>
            <el-table-column label="操作" width="140">
                <template slot-scope="scope">
                    <el-button type="warning" size="small" @click="jumpToDesign(scope.row)">查看</el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
                background
                @current-change="handleCurrentChangeResolve"
                layout="prev, pager, next, jumper"
                :total="resolvePageSize">
        </el-pagination>
    </div>

</template>

<script lang="ts">
    import Vue from 'vue'
    export default{
        props: ['taskFinishedData', 'handleCurrentChangeResolve', 'resolvePageSize', 'loading', 'personLevel', 'doctorOptions', 'changeDoctId', 'getResolvedOther', 'unResolvedNum'],
        data() {
            return {
                selectDoctor: '高云'
            }
        },
        methosd: {
            jumpToDesign(row) {
                this.$router.push("EcgTagging");
                let postId = row.userId + "/" + row.reportId;
                localStorage.setItem('reportId', postId);
                localStorage.setItem('ecgDataId', row.id);
                localStorage.setItem('status', 'check');
            }
        }
    }
</script>

<style scoped>

</style>
