<template>
    <el-row class="warp">
        <el-dialog
                :title="dialogTitle"
                width="960px"
                :visible.sync="dialogVisible">
            <Process :states="progressState"></Process>
            <div style="max-height: 600px;overflow-y: scroll">
                <el-table
                        :data="tableData"
                        style="text-align: center;"
                        border>
                    <el-table-column
                            type="index"
                            width="60"
                            label="编号">
                    </el-table-column>
                    <el-table-column
                            prop="time"
                            label="时间">
                    </el-table-column>
                    <el-table-column
                            prop="operator_name"
                            label="操作员">
                        <template slot-scope="scope">
                            <span v-if="scope.row.operator_institution_name === null || scope.row.operator_institution_name === institution">{{scope.row.operator_name}}</span>
                            <span v-else>{{scope.row.operator_name + '(' + scope.row.operator_institution_name + ')'}}</span>
                        </template>
                    </el-table-column>
                    <el-table-column
                            prop="operation"
                            label="操作">
                    </el-table-column>
                    <el-table-column
                            prop="state"
                            label="状态">
                        <template slot-scope="scope">
                            <span :style="{color: colorFillMap[scope.row.state]}">{{scope.row.state}}</span>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

        </el-dialog>
        <el-col :span="24" class="warp-breadcrum">
            <el-breadcrumb separator="/">
                <!-- <el-breadcrumb-item :to="{ path: '/' }"><b>首页</b></el-breadcrumb-item> -->
                <!-- <el-breadcrumb-item>病人列表</el-breadcrumb-item> -->
            </el-breadcrumb>
        </el-col>

        <!--<div>
            <StaticsTitle/>
        </div>-->

        <el-col :span="24" class="warp-main" v-loading="loading" element-loading-text="拼命加载中">
            <!--工具条-->
            <el-col :span="24" class="toolbar" style="padding-bottom: 0px;">
                <el-form :inline="true" :model="filters" :rules="searchReportsFormRules" ref="searchReportsForm">
                    <el-form-item label="患者或医生姓名：" prop="name">
                        <el-input v-model.trim="filters.name" placeholder="请输入" class="select-common"
                                  @keyup.enter.native="handleSearch">
                            <i slot="suffix" class="el-input__icon el-icon-error"
                               v-if="filters.name!==''" style="cursor: pointer;" @click="filters.name='';handleSearch()"></i>
                        </el-input>
                    </el-form-item>

                    <el-form-item label="报告ID：" prop="id">
                        <el-input v-model.trim="filters.id" placeholder="请输入" class="select-common"
                                  @keyup.enter.native="handleSearch(null, false)">
                            <i slot="suffix" class="el-input__icon el-icon-error"
                               v-if="filters.id!==''" style="cursor: pointer;" @click="filters.id='';handleSearch()"></i>
                        </el-input>
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
                            @change="handleSearch(null, false)"
                    >
                    </el-date-picker>
                    <el-form-item>
                        <el-button type="primary" @click="handleSearch(null, false)" style="margin-left: 10px">查询
                        </el-button>
                        <el-button @click="reset">重置</el-button>
                        <el-button type="primary" @click="exportExcel">导出Excel</el-button>
                        <el-button type="primary" @click="clusterFile">一键归档</el-button>
                    </el-form-item>
                </el-form>
            </el-col>
            <el-col>
                <el-tabs v-model="filters.report_states" type="card" @tab-click="handleSearch(null, false)">
                    <el-tab-pane label="全部" name="ALL"></el-tab-pane>
                    <el-tab-pane label="已完成" name="FINISH"></el-tab-pane>
                    <el-tab-pane label="已审核" name="AUDIT_PASS"></el-tab-pane>
                    <el-tab-pane label="审核中" name="AUDITING"></el-tab-pane>
                    <el-tab-pane label="标注中" name="EDITING"></el-tab-pane>
                    <el-tab-pane label="分析完" name="WAIT_FOR_EDIT"></el-tab-pane>
                    <el-tab-pane label="分析失败" name="ANALYZE_FAILED">
                        <span slot="label" style="padding-right: 10px" v-if="hackResetBadge">
                            <el-badge :value="slotData.analyzeFailedCount" class="item" ref="analyzeFailedCount">
                                分析失败
                            </el-badge>
                        </span>
                    </el-tab-pane>
                    <el-tab-pane label="分析中" name="ANALYZING"></el-tab-pane>
                    <el-tab-pane label="待分析" name="WAIT_FOR_ANALYZE">
                        <span slot="label" style="padding-right: 10px">
                            <el-badge :value="slotData.waitForAnalyzeCount" class="item" ref="waitForAnalyzeCount">
                                待分析
                            </el-badge>
                        </span>
                    </el-tab-pane>
                    <el-tab-pane label="上传失败" name="UPLOAD_FAILED">
                        <span slot="label" style="padding-right: 10px">
                            <el-badge :value="slotData.updateFailedCount" class="item" ref="updateFailedCount">
                                上传失败
                            </el-badge>
                        </span>
                    </el-tab-pane>
                    <el-tab-pane label="未上传" name="INITIAL"></el-tab-pane>
                    <el-tab-pane label="已删除" name="DELETED"></el-tab-pane>
                </el-tabs>
            </el-col>

            <!--列表-->
            <el-table :data="users" highlight-current-row v-loading="loading"
                      style="width: 100%;" @sort-change="tableSort"
                      ref="usersTable"
            >
                <el-table-column prop="record_id" label="报告ID" sortable="custom" width="90">
                </el-table-column>
                <el-table-column prop="name" label="患者" sortable="custom" width="80">
                </el-table-column>
                <el-table-column prop="gender" label="性别" sortable="custom" width="80">
                    <template slot-scope="scope">
                        {{scope.row.gender === 'FEMALE' ? ' 女' : '男'}}
                    </template>
                </el-table-column>
                <el-table-column prop="age" label="年龄" sortable="custom">
                </el-table-column>
                <el-table-column prop="phone" label="电话">
                </el-table-column>
                <el-table-column prop="uploaderName" label="上传医生" sortable="custom" width="240">
                    <template slot-scope="scope">
                        {{namePlusHospital(scope.row.uploaderName, scope.row.uploader_hospital)}}
                    </template>
                </el-table-column>
                <el-table-column prop="doctorName" label="标注医生" sortable="custom" width="240">
                    <template slot-scope="scope">
                        {{namePlusHospital(scope.row.doctorName, scope.row.editor_hospital)}}
                    </template>
                </el-table-column>
                <el-table-column prop="auditorName" label="审核医生" sortable="custom" width="240">
                    <template slot-scope="scope">
                        {{namePlusHospital(scope.row.auditorName, scope.row.auditor_hospital)}}
                    </template>
                </el-table-column>
                <el-table-column prop="report_state" label="报告状态" sortable="custom" width="160">
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
                <el-table-column
                        fixed="right"
                        label="操作"
                        width="280">
                    <template slot-scope="scope">
                        <el-button @click="assignDoctorClick(scope.row)" type="text" size="small"
                                   style="padding: 0 5px"
                                   v-if="scope.row.report_state==='EDITING'&& filters.report_states!== 'DELETED'">
                            分配
                        </el-button>

                        <el-button @click="viewReport(scope.row, scope.$index)"
                                   type="text"
                                   size="small"
                                   v-if="(scope.row.report_state==='FINISH'||scope.row.report_state==='WAIT_FOR_EDIT'
                                   ||scope.row.report_state==='EDITING'||scope.row.report_state==='AUDITING'
                                   ||scope.row.report_state==='AUDIT_PASS') && filters.report_states !== 'DELETED'
                                   || (scope.row.report_state==='EDITING'||scope.row.report_state==='AUDITING'
                                   ||scope.row.report_state==='WAIT_FOR_EDIT')&& filters.report_states=== 'DELETED'
                                   ">
                            查看
                        </el-button>
                        <el-button @click="finishReport(scope.row)" type="text"
                                   size="small"
                                   v-if="scope.row.report_state==='AUDIT_PASS' && filters.report_states!== 'DELETED'"
                                    :disabled="finishReportLoading &&finishReportId===scope.row.record_id"
                        >
                            归档
                        </el-button>

                        <el-button
                                type="text"
                                style="padding: 0 5px"
                                size="small"
                                v-if="(scope.row.report_state==='FINISH'||scope.row.report_state==='AUDIT_PASS') && filters.report_states!== 'DELETED'"
                                @click="reloadPdf(scope.row)"
                        >
                            报告
                        </el-button>
                        <el-button
                                type="text"
                                style="padding: 0 5px"
                                v-if="filters.report_states === 'DELETED'"
                                size="small"
                                @click="deleteReport(scope.row, true)"
                        >
                            恢复
                        </el-button>
                        <el-button
                                type="text"
                                style="padding: 0 5px"
                                v-if="(scope.row.report_state==='INITIAL'||scope.row.report_state==='UPLOAD_FAILED'||
                                scope.row.report_state==='ANALYZE_FAILED'||scope.row.report_state==='WAIT_FOR_EDIT'
                                ||scope.row.report_state==='WAIT_FOR_ANALYZE'||scope.row.report_state==='EDITING'
                                ||scope.row.report_state==='AUDITING')&& filters.report_states!== 'DELETED'"
                                @click="deleteReport(scope.row , false)"
                                size="small">
                            删除
                        </el-button>
                        <el-button
                                type="text"
                                style="padding: 0 5px"
                                v-if="filters.report_states === 'DELETED'"
                                size="small" @click="deleteReportReal(scope.row)">
                            删除
                        </el-button>
                        <el-button
                                type="text"
                                style="padding: 0 5px"
                                @click="viewReportProcess(scope.row)"
                                size="small">
                            工单
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!--工具条-->
            <el-col :span="24" class="toolbar">
                <!-- <el-button type="danger" @click="batchDeleteBook" :disabled="this.sels.length===0">批量删除</el-button> -->
                <el-pagination
                        @current-change="handleCurrentChange"
                        :page-size="10"
                        background
                        v-if="hackResetPage"
                        layout="total, prev, pager, next, jumper"
                        :total="total"
                        style="margin-top: 10px"
                >
                </el-pagination>
            </el-col>
        </el-col>
        <el-dialog title="分配其它医生" :visible.sync="dialogTableVisible" width="40%" @close="closeAssignDialog">
            <el-form :inline="true" :model="form" ref="assignForm" :rules="searchReportsFormRules">
                <el-form-item label="医生姓名" prop="name">
                    <el-input v-model.trim="form.name" auto-complete="off"
                              style="width: 250px"
                              @keyup.enter.native="handleDoctorSearch">
                        <i slot="suffix" class="el-input__icon el-icon-error"
                           v-if="form.name!==''" style="cursor: pointer;" @click="form.name='';handleDoctorSearch()"></i>
                    </el-input>
                </el-form-item>
                <el-form-item label="所属医院">
                    <ExpandTree
                            ref="assignTree"
                            style=""
                            @selectValue="selectAssignHospital"
                            @focus="assignGetHospitals"
                            :treeData="assignTreeData"
                            :loading="assignGetHospitalLoading"
                            @clear="clearAssignSelectedHospital"
                    >
                    </ExpandTree>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleDoctorSearch">查询</el-button>
                </el-form-item>
            </el-form>

            <el-table :data="gridData" @sort-change="assignTableSort" ref="assignTable">
                <el-table-column property="doctorId" label="编号"></el-table-column>
                <el-table-column property="doctorNickName" label="医生姓名" sortable="custom">
                    <template slot-scope="scope">
                        {{scope.row.doctorNickName}}({{scope.row.doctorName}})
                    </template>
                </el-table-column>
                <el-table-column property="institutionName" label="所属医院" sortable="custom">
                </el-table-column>
                <el-table-column property="workNum" label="工作量" sortable="custom"></el-table-column>
                <el-table-column
                        fixed="right"
                        label="操作">
                    <template slot-scope="scope">
                        <el-button @click="assignDoctor(scope.$index,scope.row)" type="text" size="small">分配</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>

    </el-row>
</template>

<script>
    import API from "../../api/api_user";
    import APIReport from '../../api/api_ecg_view';
    import APIReportServe from '../../api/api_report'
    import StaticsTitle from "./staticsTitle.vue";
    import Util from '../../common/util';
    import Process from '../process';
    import PatientList from '../../components/PatientList';
    import AiWebsocket from '../../components/AiWebsocket';
    import AssignDoctor from '../../components/AssignDoctor';
    import ExpandTree from '../../components/common/ExpandTree.vue';

    export default {
        components: {
            StaticsTitle,
            Process,
            ExpandTree
        },
        mixins: [PatientList, AiWebsocket, AssignDoctor],
        data() {
            return {
                dialogFormVisible: false,
                colorFillMap: {
                    '未上传': Util.globalStateColorMap['INITIAL'], //未上传
                    '待分析': Util.globalStateColorMap['WAIT_FOR_ANALYZE'], //待分析
                    '上传失败': Util.globalStateColorMap['ANALYZE_FAILED'], //上传失败
                    '分析失败': Util.globalStateColorMap['UPLOAD_FAILED'],
                    '分析完': Util.globalStateColorMap['WAIT_FOR_EDIT'], //分析完
                    '标注中': Util.globalStateColorMap['EDITING'], //标注中
                    '审核中': Util.globalStateColorMap['AUDITING'], //审核中
                    '分析中': Util.globalStateColorMap['ANALYZING'], //审核中
                    '已审核': Util.globalStateColorMap['AUDIT_PASS'], //已审核
                    '已完成': Util.globalStateColorMap['FINISH'],  //已完成
                },
                formLabelWidth: "120px",
                tableData: [
                    {
                        number: 1,
                        time: '2018-12-12 12:00',
                        operator: '周丽',
                        operate: '录入系统',
                        state: '未上传'
                    }
                ],
                dialogVisible: false,
                dialogTitle: '报告进度【张三】',
                institution: '',
                hospitalOptions: [
                    {
                        value: 0,
                        label: '五医院'
                    },
                    {
                        value: 1,
                        label: '攀枝花医院'
                    },
                ],
                dataTypeOptions: [
                    {
                        value: 0,
                        label: '体检'
                    },
                    {
                        value: 1,
                        label: '长程'
                    }
                ],
                progressState: [0, 0, 0, 0, 0, 0],
                circleColors: {
                    '4': '#5daf34',
                    '5': '#af2c1c',
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
        computed: {},
        watch: {
            loading(loading) {
                if (!loading && this.websocketConnectState) {
                    console.log('重新向服务端发送websocket消息');
                    this.websocketSendInfo();
                }
            }
        },
        methods: {
            clusterFile() {
                this.$confirm(`是否将所有未归档的已审核数据一键归档？`, '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then((action) => {
                    if (action === 'confirm') {
                        APIReportServe
                            .markFinish({})
                            .then( _ => {
                                this.$message.success('归档成功!');
                                this.handleSearch(null, false);
                            })
                            .catch( _ => {
                                this.handleSearch(null, false);
                            })
                    }
                })
            },
            viewReport(val, index) {
                localStorage.setItem('report_id', val.record_id);
                localStorage.setItem('scope_row', JSON.stringify(val));
                this.$router.push({path: "/doctor/ecgView"});
            },
            downLoadReport(row) {
                window.open("/pdf/generate/?report_id=" + row.record_id);
            },
            reAnalyst(row) {
                this.$confirm('确定重新AI分析该条数据，可能会导致数据状态初始化？', '提示', {
                    showCancelButton: false,
                    type: 'warning'
                }).then(() => {
                    APIReport.reAnalystPart(row.record_id, {
                        from: 0,
                        to: -1
                    }).then(data => {
                        this.search();
                    });
                });
            },
            viewReportProcess(row) {
                let temp = [0, 0, 0, 0, 0, 0];
                APIReportServe.getReportFlow(row.record_id, {}).then(data => {
                    if (data.institution) {
                        this.institution = data.institution.name;
                        this.dialogTitle = `报告进度【${data.patient.name}】(${this.institution})`;
                    }
                    const PROCESSIONMAP = ["UNPROCESSED", "PROCESSING", "PROCESSED", "REPROCESSING"];

                    data.progresses.map((item, index) => {
                        temp[index] = PROCESSIONMAP.indexOf(item.status);
                    });
                    this.progressState = data.progresses;
                    this.tableData = data.flows;
                    this.dialogVisible = true;
                });
            },
            handleCurrentChange(val) {
                this.page = val;
                this.search();
            },
            reloadPdf(row) {
                let report_id = row.record_id;
                let url = `/pdf/${report_id}/status`;
                let iframeSrc = window.location.protocol + '//' + window.location.hostname + '/pdf/generate/?report_id=' + row.record_id;
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
                });
            }
        },
        mounted() {
            this.handleSearch(() => {
                this.initWebsocket();
            }, false);
        },
        beforeDestroy() {
            console.log('关闭ai进度的websocket!');
            this.websocket.close();
        }
    };
</script>
<style>
    .warp .el-dialog__header {
        padding: 20px 20px 10px;
        border-bottom: 1px solid #ccc;
    }

    .warp .el-table .cell, .el-table--border td:first-child .cell {
        text-align: center;
    }

    .warp .el-badge__content.is-fixed {
        top: 8px;
        right: 2px;
    }
</style>
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

    .warp /deep/ .el-dialog__body {
        padding: 20px;
    }
</style>
