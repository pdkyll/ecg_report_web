<template>
    <el-row class="warp">
        <el-col :span="24" class="warp-breadcrum">
            <el-breadcrumb separator="/">
            </el-breadcrumb>
        </el-col>

        <el-col :span="24" class="warp-main" v-loading="loading" element-loading-text="拼命加载中">
            <!--工具条-->
            <el-col :span="24" class="toolbar" style="padding-bottom: 0px;">
                <el-form :inline="true" :model="filters" :rules="searchReportsFormRules" ref="searchReportsForm">
                    <label for="" class="input-label">患者或医生姓名：</label>
                    <el-input v-model.trim="filters.name" placeholder="请输入" class="select-common"
                              @keyup.enter.native="handleSearch"></el-input>
                    <el-form-item label="报告ID：" prop="id">
                        <el-input v-model.trim="filters.id" placeholder="请输入" class="select-common"
                                  @keyup.enter.native="handleSearch(null, false)"></el-input>
                    </el-form-item>
                    <el-date-picker
                            v-model="filters.reportTimeSelected"
                            type="datetimerange"
                            :picker-options="reportTimePicker"
                            range-separator="至"
                            start-placeholder="录入开始时间"
                            end-placeholder="录入结束时间"
                            align="center"
                            :default-time="['00:00:00', '23:59:00']"
                            format="yyyy/MM/dd HH:mm"
                            value-format="yyyy/MM/dd HH:mm"
                            @change="handleSearch"
                    >
                    </el-date-picker>

                    <el-form-item>
                        <el-button type="primary" @click="handleSearch" style="margin-left: 10px">查询</el-button>
                        <el-button @click="reset">重置</el-button>
                        <el-button type="primary" @click="exportExcel">导出Excel</el-button>
                        <el-button type="primary" @click="clusterFile">一键归档</el-button>
                    </el-form-item>
                </el-form>
            </el-col>
            <el-col :span="24">
                <el-tabs v-model="filters.report_states" type="card" @tab-click="handleSearch">
                    <el-tab-pane label="全部" name="UPLOADER_ALL"></el-tab-pane>
                    <el-tab-pane label="未上传" name="INITIAL"></el-tab-pane>
                    <el-tab-pane label="上传失败" name="UPLOAD_FAILED"></el-tab-pane>
                    <el-tab-pane label="待分析" name="WAIT_FOR_ANALYZE"></el-tab-pane>
                    <el-tab-pane label="分析中" name="ANALYZING"></el-tab-pane>
                    <el-tab-pane label="分析失败" name="ANALYZE_FAILED"></el-tab-pane>
                    <el-tab-pane label="分析完" name="WAIT_FOR_EDIT"></el-tab-pane>
                    <el-tab-pane label="标注中" name="EDITING"></el-tab-pane>
                    <el-tab-pane label="审核中" name="AUDITING"></el-tab-pane>
                    <el-tab-pane label="已审核" name="AUDIT_PASS"></el-tab-pane>
                    <el-tab-pane label="已完成" name="FINISH"></el-tab-pane>
                </el-tabs>
            </el-col>

            <!--列表-->
            <el-table :data="users" highlight-current-row v-loading="loading"
                      style="width: 100%;" @sort-change="tableSort" ref="usersTable">
                <el-table-column prop="record_id" label="报告ID" width="90" sortable="custom">
                </el-table-column>
                <el-table-column prop="name" label="患者" sortable="custom">
                </el-table-column>
                <el-table-column prop="gender" label="性别" sortable="custom">
                    <template slot-scope="scope">
                        {{scope.row.gender === 'FEMALE' ? ' 女' : '男'}}
                    </template>
                </el-table-column>
                <el-table-column prop="phone" label="电话">
                </el-table-column>
                <el-table-column prop="report_state" label="报告状态" sortable="custom">
                    <template slot-scope="scope">
                        <div>
                            <span style="margin-right: 2px">{{formatReportState(scope.row)}}</span>
                            <span :style="{color:reportStateCircleColor(scope.row)}">●</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="record_time" label="录入时间" sortable="custom">
                </el-table-column>
                <el-table-column prop="uploaded_time" label="上传时间" sortable="custom">
                </el-table-column>
                <el-table-column prop="doctorName" label="标注医生" sortable="custom">
                    <template slot-scope="scope">
                        {{namePlusHospital(scope.row.doctorName, scope.row.editor_hospital)}}
                    </template>
                </el-table-column>
                <el-table-column prop="auditorName" label="审核医生" sortable="custom">
                    <template slot-scope="scope">
                        {{namePlusHospital(scope.row.auditorName, scope.row.auditor_hospital)}}
                    </template>
                </el-table-column>
                <el-table-column
                        fixed="right"
                        label="操作"
                        width="200">
                    <template slot-scope="scope">
                        <el-button @click="downLoadReport(scope.row)" type="text"
                                   size="small"
                                   :disabled="scope.row.report_state!=='AUDIT_PASS' && scope.row.report_state!=='FINISH'">
                            报告
                        </el-button>
                        <el-button @click="finishReport(scope.row)" type="text"
                                   size="small"
                                   :disabled="scope.row.report_state!=='AUDIT_PASS'||(finishReportLoading &&finishReportId===scope.row.record_id)">
                            归档
                        </el-button>
                        <el-button @click="viewReport(scope.row, scope.$index)"
                                   type="text"
                                   size="small"
                                   v-if="scope.row.report_state==='FINISH'|| scope.row.report_state==='AUDIT_PASS'">
                            查看
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!--工具条-->
            <el-col :span="24" class="toolbar">
                <el-pagination
                        @current-change="handleCurrentChange"
                        :page-size="10"
                        background
                        layout="total, prev, pager, next, jumper"
                        :total="total"
                        :current-page="page"
                        style="margin-top: 10px"
                >
                </el-pagination>
            </el-col>

        </el-col>

    </el-row>
</template>

<script>
    import API from "../../api/api_user";
    import Util from '../../common/util';
    import PatientList from '../../components/PatientList';
    import AiWebsocket from '../../components/AiWebsocket';
    import APIReport from '../../api/api_report';

    export default {
        components: {},
        mixins: [PatientList, AiWebsocket],
        data() {
            return {
                gridData: [],
                dialogTableVisible: false,
                dialogFormVisible: false,
                form: {
                    name: "",
                    user_id: ""
                },
                formLabelWidth: "120px",
                circleColors: {
                    '1': '#5daf34',
                    '0': '#af2c1c',
                },
                recordStateMap: {
                    '0': '待分析',
                    '1': '分析中',
                    '4': '分析完',
                    '5': '分析失败',
                    '6': '未上传'
                },
            };
        },
        methods: {
            viewReport(val, index) {
                localStorage.setItem('report_id', val.record_id);
                localStorage.setItem('scope_row', JSON.stringify(val));
                this.$router.push({path: "/doctor/ecgView"});
            },
            clusterFile() {
                this.$confirm(`是否将所有未归档的已审核数据一键归档？`, '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then((action) => {
                    if (action === 'confirm') {
                        APIReport
                            .markFinish({})
                            .then( _ => {
                                this.$message.success('归档成功!');
                                this.handleSearch(null, false);
                            })
                    }
                })
            },
            downLoadReport(row) {
                let report_id = row.record_id;
                let url = `/pdf/${report_id}/status`;
                let iframeSrc = "/pdf/generate/?report_id=" + row.record_id;
                let that = this;
                $.ajax({
                    url: url,
                    type: 'get',
                    async: false,
                    success: function (data) {
                        if (data.isReady) {
                            window.open(iframeSrc, '_blank');
                        } else {
                            that.$message.error('数据正在计算中，请稍后重试');
                        }
                    },
                    fail: function () {
                        that.$message.error('数据正在计算中，请稍后重试');
                    }
                })
            },
            handleCurrentChange(val) {
                this.page = val;
                this.search();
            },
        },
        created() {

        },
        mounted() {
            this.handleSearch(() => {
                this.initWebsocket();
            }, true);
        },
        beforeDestroy() {
            this.websocket.close();
        }
    };
</script>

<style scoped>
    .input-label {
        font-size: 14px;
    }

    .select-common {
        width: 150px;
        margin-right: 10px;
    }

    .circle {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        vertical-align: middle;
    }
</style>
