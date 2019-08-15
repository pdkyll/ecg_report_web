<template>
    <div class="agentBox">
        <AddNewHospitalDialog :searchPage="handleSearch"/>
        <span class="searchText">医院名称:</span>
        <ExpandTree style="margin-right: 10px;margin-left: 10px"
                    ref="expandTree"
                    @selectValue="selectedHospital"
                    @focus="getHospitals"
                    :treeData="treeData"
                    :loading="getHospitalLoading"
                    :defaultValue="filters.hospital_label"
                    @clear="clearSelectedHospital"
                    v-if="hackResetHospital"
        >
        </ExpandTree>
        <el-button type="success" @click="openAddNewDialog(false, null, null, 0)">+ 新建</el-button>
        <el-date-picker
                v-model="filters.reportTimeSelected"
                type="datetimerange"
                :picker-options="reportTimePicker"
                range-separator="至"
                start-placeholder="统计开始时间"
                end-placeholder="统计结束时间"
                align="center"
                :default-time="['00:00:00', '23:59:59']"
                format="yyyy/MM/dd HH:mm:ss"
                value-format="yyyy/MM/dd HH:mm:ss"
                style="margin-left: 20px"
                @change="handleSearch"
        >
        </el-date-picker>
        <el-table
                :data="tableData"
                style="width: 100%;margin-bottom: 20px;"
                v-loading="pageLoading"
                ref="usersTable"
                highlight-current-row
                :default-expand-all="true"
                @sort-change="sortPage"
                row-key="id">
            <el-table-column
                    prop="name"
                    label="医院名称">
            </el-table-column>
            <el-table-column
                    label="报告统计">
                <template slot-scope="scope">
                    共<span style="color: #5a5aff">{{scope.row.totalCount}}</span>份心电报告，
                    已完成<span style="color: #5aad5a">{{scope.row.finishedCount}}</span>，
                    还剩<span style="color: #ff5a5a">{{scope.row.totalCount - scope.row.finishedCount}}</span>份
                </template>
            </el-table-column>
            <el-table-column
                    prop="doctorCount"
                    sortable="custom"
                    label="医生人数">
            </el-table-column>
            <el-table-column
                    prop="reportTemplate"
                    label="报告模板">
                <template slot-scope="scope">
                    {{reportTemplate[scope.row.reportTemplate]}}
                </template>
            </el-table-column>
            <el-table-column
                    label="操作"
            >
                <template slot-scope="scope">
                    <el-button
                            type="text"
                            style="padding: 0 5px"
                            @click="addNewInstitutions(scope.row, 1)"
                            size="small">
                        新增
                    </el-button>
                    <span>|</span>
                    <el-button
                            type="text"
                            style="padding: 0 5px"
                            size="small"
                            @click="deleteInstitution(scope.row.id)"
                    >
                        删除
                    </el-button>
                    <span>|</span>
                    <el-button
                            type="text"
                            style="padding: 0 5px"
                            @click="addNewInstitutions(scope.row, 2)"
                            size="small">
                        系统配置
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>
<script>

    import AddNewHospitalDialog from './AddNewHospitalDialog';
    import {bus} from '../../bus';
    import PageManage from './PageManage';
    import API from '../../api/api_super_admin';
    import ExpandTree from '../common/ExpandTree.vue';
    import {mapState} from 'vuex';
    import APIUser from "../../api/api_user";
    import Util from '../../common/util';

    export default {
        components: {
            AddNewHospitalDialog,
            ExpandTree
        },
        mixins: [PageManage],
        data() {
            return {
                tableData: [],
                resetTree: false,
                pageLoading: false,
                enterTreeBoxState: false,
                treeData: [],
                hospitalName: '',
                getHospitalLoading: false,
                filters: {
                    name: "",
                    report_states: '',
                    reportTimeSelected: '',
                    hospital_id: '',
                    hospital_label: '',
                    id: '',
                    sort: 'RECORD_TIME',
                    sort_state: 'DOWN'
                },
                hackResetHospital: true,
                reportTimePicker: {
                    shortcuts: [
                        {
                            text: '今日',
                            onClick(picker) {
                                let now = new Date();
                                let end = new Date(now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' 23:59:00');
                                let start = new Date(now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' 00:00:00');
                                picker.$emit('pick', [start, end]);
                            }
                        },
                        {
                            text: '最近一周',
                            onClick(picker) {
                                picker.$emit('pick', Util.calcShortCuts(7));
                            }
                        }, {
                            text: '最近一个月',
                            onClick(picker) {
                                picker.$emit('pick', Util.calcShortCuts(30));
                            }
                        }, {
                            text: '最近三个月',
                            onClick(picker) {
                                picker.$emit('pick', Util.calcShortCuts(90));
                            }
                        }]
                },
                timer: null,
                reportTemplate: {
                    'panzhihua': '体检模板',
                    'default': '长程模板'
                },
                setFirstLine: false
            }
        },
        mounted() {
            this.showExpand = false;
            let institutionId = this.$route.params.institutionId;
            let accessUser = JSON.parse(localStorage.getItem('access-user'));
            this.filters.hospital_id = accessUser.hospital_id;
            if (institutionId) {
                let insititutionName = this.$route.params.institutionName;
                this.hospitalName = insititutionName;
                this.filters = {
                    hospital_id:institutionId,
                    hospital_label:insititutionName
                };
                this.hackResetHospital = false;
                this.$nextTick(() => {
                    this.hackResetHospital = true;
                });
                this.setFirstLine = true;
                bus.$emit('changeSelectIndex', "1");
            }
            this.getPageList();
        },
        computed: {
            ...mapState('stayPageState', {
                saveFilters: state => state.saveFilters
            }),
        },
        methods: {
            openAddNewDialog(addState, id, name, toState, fromNowHospital) {
                bus.$emit('openAddNewHospitalDialog', {
                    state: addState,
                    id: id,
                    name: name,
                    toState: toState,
                    fromNowHospital
                });
            },
            getHospitals() {
                this.getHospitalLoading = true;
                APIUser.getInstitutions({
                    showReportCount: true
                }).then(res => {
                    this.treeData = res;
                }).finally(() => {
                    this.getHospitalLoading = false;
                })
            },
            clearSelectedHospital() {
                this.filters.hospital_id = '';
                this.filters.hospital_label = '';
                this.handleSearch();
            },
            selectedHospital(val) {
                this.filters.hospital_id = val.id;
                this.filters.hospital_label = val.label;
                this.handleSearch();
            },
            openEditDoctorDialog(val) {
                bus.$emit('openEditDoctorDialog', val);
            },
            getPageList() {
                this.pageLoading = true;
                API.viewAgencyList({
                    page: this.page,
                    search: this.hospitalName,
                    sort: 'DOCTOR_COUNT',
                }).then(data => {
                    this.pageLoading = false;
                    this.tableData = data.hospitalShowEntityList;
                    this.total = data.totalCount;
                    if (this.setFirstLine) {
                        this.setCurrent(this.tableData[0]);
                        this.setFirstLine = false;
                    }
                }).catch(() => {
                    this.pageLoading = false;
                })
            },
            handleSearch() {
                if (this.filters.hospital_id) {
                    this.page = 1;
                    this.pageLoading = true;
                    let startTime= '',
                        endTime = '';
                    if (this.filters.reportTimeSelected) {
                        startTime = this.filters.reportTimeSelected[0];
                        endTime = this.filters.reportTimeSelected[1];
                    }
                    API.getHospitals({
                        start_time: startTime,
                        end_time: endTime
                    }, this.filters.hospital_id).then(data => {
                        this.tableData = [data];
                        this.pageLoading = false;
                    }).catch(err => {
                        this.pageLoading = false;
                    });
                } else {
                    this.getPageList();
                }
            },
            searchPage(changeList = false, both = false) {
                this.page = 1;
                API.viewAgencyList({
                    page: this.page,
                    search: this.hospitalName,
                    sort: 'DOCTOR_COUNT',
                }).then(data => {
                    if (changeList) {
                        this.resetTree = false;
                        this.$nextTick(() => {
                            this.resetTree = true;
                        });
                    } else {
                        this.tableData = data.hospitalShowEntityList;
                    }
                    if (both) {
                        this.tableData = data.hospitalShowEntityList;
                    }
                    this.total = data.totalCount;
                });
            },
            setCurrent(row) {
                this.$refs.usersTable.setCurrentRow(row);
            },
            sortPage(val) {
                const orderMap = {
                    "descending": 'DOWN',
                    "ascending": 'UP'
                };
                const sortType = {
                    "doctorCount": 'DOCTOR_COUNT',
                };
                this.page = 1;
                this.pageLoading = true;
                API.viewAgencyList({
                    page: this.page,
                    search: this.hospitalName,
                    sort: sortType[val.prop],
                    sort_state: orderMap[val.order]
                }).then(data => {
                    this.pageLoading = false;
                    this.tableData = data.hospitalShowEntityList;
                    this.total = data.totalCount;
                }).catch(err => {
                    this.pageLoading = false;
                });
            },
            handleSizeChange(val) {
                this.limit = val;
                this.searchPage(false, false);
            },
            handleCurrentChange(val) {
                this.page = val;
                this.searchPage(false, false);
            },
            deleteInstitution(val) {
                this.$confirm(`确认要删除所选医院？`, '', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    callback: action => {
                        if (action === 'confirm') {
                            API.deleteAgency({}, val)
                                .then(_ => {
                                    this.searchPage(false, true);
                                    this.$message.success('删除成功!')
                                });
                        }
                    }
                });

            },
            addNewInstitutions(val, toState) {
                let nowHospital = JSON.parse(localStorage.getItem('access-user')).hospital;
                let fromNowHospital = val.name === nowHospital;
                this.openAddNewDialog(true, val.id, val.name, toState, fromNowHospital);
            }
        }
    }
</script>
<style>
    /*.agentBox .el-dialog__body {*/
    /*padding: 9px 20px 30px 20px;*/
    /*}*/

    .agentBox .el-form-item {
        margin-bottom: 16px;
    }

    .el-treeBox .el-tree {
        border: 1px solid #ccc;
        min-width: 280px;
        max-height: 400px;
        overflow-y: scroll;
        border-radius: 3px;
    }
</style>
<style scoped>
    .agentBox {
        box-sizing: border-box;
        padding: 18px 40px;
    }

    .searchText {
        font-size: 14px;
    }

    .expandBox {
        position: relative;
    }

    .el-treeBox {
        position: absolute;
        z-index: 2099;
        top: 34px;
        left: 20px;
    }
</style>