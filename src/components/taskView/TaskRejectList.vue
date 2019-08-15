<template>
    <div>
        <el-table
                :data="taskRejectData"
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
            <el-table-column label="操作"
                             width="140"
            >
                <template slot-scope="scope">
                    <el-button type="warning" size="small" @click="jumpToDesign(scope.row)">修改</el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
                background
                @current-change="handleCurrentChangeRepulse"
                layout="prev, pager, next, jumper"
                :total="repulsePageSize">
        </el-pagination>
    </div>

</template>

<script lang="ts">
    import Vue from 'vue'
    export default{
        props: ['taskRejectData', 'handleCurrentChangeRepulse', 'repulsePageSize', 'loading'],
        methods: {
            jumpToDesign(row) {
                this.$router.push("EcgTagging");
                let postId = row.userId + "/" + row.reportId;
                localStorage.setItem('reportId',postId);
                localStorage.setItem('ecgDataId',row.id);
                localStorage.setItem('status', 'label');
            }
        }
    }
</script>

<style scoped>

</style>
