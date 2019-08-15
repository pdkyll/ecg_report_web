<template>
    <el-row class="warp">
        <el-col :span="24" class="warp-breadcrum">
            <el-breadcrumb separator="/">
                <!-- <el-breadcrumb-item :to="{ path: '/' }"><b>首页</b></el-breadcrumb-item> -->
                <!-- <el-breadcrumb-item>病人列表</el-breadcrumb-item> -->
            </el-breadcrumb>
        </el-col>

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
                    <label for="" class="input-label">报告所属医院：</label>
                    <ExpandTree style="margin-right: 10px"
                                ref="expandTree"
                                @selectValue="selectedHospital"
                                @focus="getHospitals"
                                :treeData="treeData"
                                :loading="getHospitalLoading"
                                :defaultValue="filters.hospital_label"
                                @clear="clearSelectedHospital"
                    >
                    </ExpandTree>
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
                            @change="handleSearch"
                    >
                    </el-date-picker>
                    <el-form-item>
                        <el-button type="primary" @click="handleSearch" style="margin-left: 10px">查询</el-button>
                        <el-button @click="reset">重置</el-button>
                    </el-form-item>
                </el-form>
            </el-col>
            <el-col :span="24">
                <el-tabs v-model="filters.report_states" type="card" @tab-click="handleSearch(null, false)">
                    <el-tab-pane label="全部" name="AUDITOR_ALL"></el-tab-pane>
                    <el-tab-pane label="已完成" name="FINISH"></el-tab-pane>
                    <el-tab-pane label="已审核" name="AUDIT_PASS"></el-tab-pane>
                    <el-tab-pane label="审核中" name="AUDITING"></el-tab-pane>
                </el-tabs>
            </el-col>
            <!--列表-->
            <el-table :data="users" highlight-current-row v-loading="loading" style="width: 100%;"
                      @sort-change="tableSort" ref="usersTable">
                <el-table-column prop="record_id" label="报告ID" width="90" sortable="custom">
                </el-table-column>
                <el-table-column prop="name" label="患者" sortable="custom">
                </el-table-column>
                <el-table-column prop="gender" label="性别" sortable="custom">
                    <template slot-scope="scope">
                        {{scope.row.gender === 'FEMALE' ? ' 女' : '男'}}
                    </template>
                </el-table-column>
                <el-table-column prop="age" label="年龄" sortable="custom">
                </el-table-column>
                <el-table-column prop="phone" label="电话">
                </el-table-column>
                <el-table-column prop="report_hospital" label="所属医院" sortable="custom">
                </el-table-column>
                <el-table-column prop="uploaderName" label="上传医生" sortable="custom">
                    <template slot-scope="scope">
                        {{namePlusHospital(scope.row.uploaderName, scope.row.uploader_hospital)}}
                    </template>
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
                <el-table-column prop="edit_time" label="标注时间" sortable="custom">
                </el-table-column>
                <el-table-column prop="audit_time" label="审核时间" sortable="custom">
                </el-table-column>
                <el-table-column
                        fixed="right"
                        label="操作"
                        width="300">
                    <template slot-scope="scope">
                        <el-button @click="viewReport(scope.row, scope.$index)" size="small"
                                   :disabled="!(scope.row.report_state === 'FINISH') && !(scope.row.report_state === 'AUDIT_PASS' && scope.row.auditor_id === doctor_id) && !(scope.row.report_state === 'AUDITING' && scope.row.locking_auditor === null) &&!(scope.row.report_state === 'AUDITING' && scope.row.locking_auditor === doctor_id)">
                            审核
                        </el-button>
                        <el-button @click="unlockReport(scope.row)" size="small"
                                   v-if="scope.row.locking_auditor === doctor_id &&scope.row.report_state!=='AUDIT_PASS'">
                            释放
                        </el-button>
                        <el-button @click="cancelAuditing(scope.row)" size="small"
                                   v-if="scope.row.report_state === 'AUDIT_PASS' && scope.row.auditor_id === doctor_id"
                        >取消审核
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                    @current-change="handleCurrentChange"
                    :page-size="10"
                    background
                    layout="total, prev, pager, next, jumper"
                    :total="total"
                    :current-page.sync="page"
                    style="margin-top: 10px"
            >
            </el-pagination>
        </el-col>
    </el-row>
</template>

<script>
    import API from "../../api/api_user";
    import APIReport from '../../api/api_report'
    import {mapActions, mapState, mapMutations} from 'vuex';
    import Util from '../../common/util';
    import {bus} from '../../bus';
    import PatientList from '../../components/PatientList';
    import ExpandTree from '../common/ExpandTree.vue';

    export default {
        mixins: [PatientList],
        data() {
            return {
                dialogVisible: false,
                doctor_id: 0,
                audit_state: "4",
                record_state: "2",
                patientName: '',
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
                }
            };
        },
        components: {
            ExpandTree
        },
        computed: {
            ...mapState('stayPageState', {
                savePage: state => state.savePage,
                saveFilters: state => state.saveFilters
            })
        },
        methods: {
            ...mapMutations('ecgView', ['changeReportId']),
            cancelAuditing(val) {
                this.$confirm('确认修改该条报告的审核状态为未审核？', '提示', {
                    showCancelButton: false
                })
                    .then(() => {
                        APIReport.revokeReportAuditing({
                            record_id: val.record_id,
                            state: 'AUDITING'
                        })
                            .then(data => {
                                this.search();
                            })
                            .catch( _ => {
                                this.search();
                            })
                    });
            },
            viewReport(val, index) {
                if (val.report_state === 'AUDIT_PASS') {
                    localStorage.setItem('report_id', val.record_id);
                    localStorage.setItem('scope_row', JSON.stringify(val));
                    localStorage.setItem('selectRow', index);
                    this.$router.push({path: "/doctor/ecgView"});
                    return;
                }
                let params = {
                    record_id: val.record_id,
                };
                API.lockForAudit(params)
                    .then(data => {
                        localStorage.setItem('report_id', val.record_id);
                        localStorage.setItem('scope_row', JSON.stringify(val));
                        localStorage.setItem('selectRow', index);
                        this.$router.push({path: "/doctor/ecgView"});
                    })
                    .catch(err => {
                        bus.$emit('hideErrorMessage', true);
                        this.$confirm(err.response.data.message, '提示', {
                            showCancelButton: false
                        })
                            .then(() => {
                                this.search();
                            })
                            .catch( _=> {
                                this.search();
                            });
                    });
            },
            unlockReport(val) {
                let params = {
                    record_id: val.record_id,
                };

                API.unlockForAudit(params)
                    .then(data => {
                        this.search();
                    })
                    .catch(_ => {
                        this.search()
                    })
            },
            generateReport(val) {
                localStorage.setItem('report_id', val.record_id);
                localStorage.setItem('scope_row', JSON.stringify(val));
                let toSrc = '/doctor/ecgReport';
                let user = JSON.parse(localStorage.getItem('access-user'));
                let userType = user.userType;
                let doctorId = user.id;
                let reportId = localStorage.getItem('report_id');
                let scopeRow = JSON.parse(localStorage.getItem('scope_row'));
                let recordState = scopeRow.record_state;
                let auditState = scopeRow.audit_state;
                let recordId = scopeRow.record_id;
                let isRecommit = scopeRow.isRecommit;

                toSrc += `?userType=${userType}&doctorId=${doctorId}&reportId=${reportId}&recordState=${recordState}&auditState=${auditState}&recordId=${recordId}&isRecommit=${isRecommit}`;
                this.$router.push({path: toSrc});
            },
            handleCurrentChange(val) {
                this.page = val;
                localStorage.setItem('selectRow', null);
                this.search();
            }
        },
        created() {
            if (this.savePage !== 0) this.page = this.savePage;
            if (this.saveFilters !== null) this.filters = this.saveFilters;
        },
        mounted() {
            let user = localStorage.getItem("access-user");
            if (user) {
                user = JSON.parse(user);
                this.doctor_id = user.id || "";
            }
            this.handleSearch(null, true);
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
