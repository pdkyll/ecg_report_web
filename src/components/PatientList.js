import {mapState, mapMutations, mapActions} from 'vuex';
import API from "../../src/api/api_user";
import Util from '../../src/common/util';
import {bus} from '../bus';
import APIReport from '../../src/api/api_report';

export default {
    data: function () {
        return {
            loading: false,
            total: 100000000000,
            users: [],
            page: 1,
            limit: 10,
            slotData: {},
            hackResetBadge: true,
            hackResetPage: true,
            setFirstLine: false,
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
            initReportStateMap: {
                '3': 'AUDITOR_ALL',
                '0': 'DOCTOR_ALL',
                '1': 'UPLOADER_ALL',
                '2': 'ALL',
                '4': 'ALL'
            },
            sortNameMap: {
                record_id: 'ID',
                name: 'PATIENT_NAME',
                gender: 'PATIENT_SEX',
                editor_hospital: 'PATIENT_HOSPITAL',
                report_state: 'REPORT_STATE',
                uploaderName: 'UPLOADER',
                doctorName: 'EDITOR',
                auditorName: 'AUDITOR',
                record_time: 'RECORD_TIME',
                uploaded_time: 'UPLOADED_TIME',
                analysis_finished_time: 'ANALYSIS_FINISHED_TIME',
                edit_time: 'EDIT_TIME',
                audit_time: 'AUDIT_TIME',
                age: 'PATIENT_AGE'
            },
            sortOrderMap: {
                ascending: 'UP',
                descending: 'DOWN'
            },
            treeData: [],
            getHospitalLoading: false,
            searchReportsFormRules: {
                id: [
                    {pattern: /^\d+$/, message: '报告ID只能是数字'},
                    {pattern: /^\d{1,25}$/, message: '报告ID最多输入25个字符'},
                ],
                name: [
                    {pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9_\-]+$/, message: '只能输入中文、英文、数字及"_"和"一"'},
                    {pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9_\-]{1,25}$/, message: '不能超过25个字符'},
                ]
            },
            fromFinish: false,
            finishReportLoading: false,
            finishReportId: 0
        };
    },
    computed: {
        initReportState() {
            return this.initReportStateMap[JSON.parse(localStorage.getItem('access-user')).userType]
        },
        ...mapState('stayPageState', {
            saveFilters: state => state.saveFilters
        }),
        ...mapState('superAdminPatientList', {
            selectRowIndex: state => state.selectRowIndex
        })
    },
    watch: {},
    methods: {
        ...mapMutations('stayPageState', [
            'changePage',
            'changeFilters'
        ]),
        reportStateCircleColor(row) {
            return Util.globalStateColorMap[row.report_state]
        },
        //报告状态显示转换
        formatReportState: function (row) {
            let state = Util.globalState[row.report_state];
            if (row.report_state_desc) {
                state += `（${row.report_state_desc}）`;
            }
            return state
        },
        handleSearch(callback, refreshPage = false) {
            if (!refreshPage) localStorage.setItem('selectRow', null);
            this.$refs.searchReportsForm.validate((valid) => {
                if (valid) {
                    !refreshPage ? this.page = 1 : this.page = this.page || 1;
                    this.hackResetPage = false;
                    this.$nextTick(() => {
                        this.hackResetPage = true;
                        this.search(callback);
                    });
                }
            });
        },
        //获取用户列表
        search: function (callback) {
            let that = this;
            let params = {
                page: that.page,
                limit: that.limit,
                name: that.filters.name,
                id: that.filters.id,
                hospital_id: that.filters.hospital_id,
                sort: that.filters.sort,
                sort_state: that.filters.sort_state
            };
            switch (this.filters.report_states) {
                case 'ALL':
                    params.accessible = true;
                    break;
                case 'DOCTOR_ALL':
                    params.accessible = true;
                    params.report_states = ['WAIT_FOR_EDIT', 'EDITING', 'AUDITING', 'AUDIT_PASS', 'FINISH']
                    break;
                case 'AUDITOR_ALL':
                    params.accessible = true;
                    params.report_states = ['FINISH', 'AUDIT_PASS', 'AUDITING'];
                    break;
                case 'UPLOADER_ALL':
                    params.accessible = true;
                    params.report_states = ['INITIAL', 'UPLOAD_FAILED', 'WAIT_FOR_ANALYZE',
                        'ANALYZING', 'ANALYZE_FAILED', 'WAIT_FOR_EDIT', 'EDITING', 'AUDITING', 'AUDIT_PASS', 'FINISH'];
                    break;
                case 'DOCTOR_EDITED':
                    params.accessible = true;
                    params.report_states = ['AUDITING', 'AUDIT_PASS', 'FINISH'];
                    break;
                case 'DELETED':
                    params.report_states = '';
                    params.accessible = false;
                    break;
                default:
                    params.report_states = that.filters.report_states;
                    params.accessible = true;
            }
            if (that.filters.reportTimeSelected) {
                params['start_time'] = that.filters.reportTimeSelected[0] + ':00';
                let endDate = new Date(that.filters.reportTimeSelected[1] + ':00');
                endDate.setMinutes(endDate.getMinutes() + 1);
                params['end_time'] = Util.formatTimeM(endDate);
            }
            that.loading = true;
            API.patientList(params)
                .then(
                    (result) => {
                        if (result) {
                            this.changePage(this.page);
                            this.changeFilters(this.filters);
                            this.users = result.users;
                            if (this.users.length === 0 && this.page !== 1) {
                                this.page = this.page - 1
                                this.search(callback)
                                return
                            }
                            this.total = result.total;
                            this.slotData = {
                                waitForAnalyzeCount: result.waitForAnalyzeCount || undefined,
                                updateFailedCount: result.updateFailedCount || undefined,
                                analyzeFailedCount: result.analyzeFailedCount || undefined
                            };
                            that.loading = false;
                            this.$refs.waitForAnalyzeCount ? this.$refs.waitForAnalyzeCount.value = this.slotData.waitForAnalyzeCount : null;
                            this.$refs.updateFailedCount ? this.$refs.updateFailedCount.value = this.slotData.updateFailedCount : null;
                            this.$refs.analyzeFailedCount ? this.$refs.analyzeFailedCount.value = this.slotData.analyzeFailedCount : null

                            let selectRowIndex = localStorage.getItem('selectRow');
                            if (selectRowIndex) {
                                this.setCurrent(this.users[Number(selectRowIndex)]);
                            }
                            if (this.fromFinish) {
                                this.setCurrent(this.users[this.selectRowIndex]);
                            }
                            if (this.setFirstLine) {
                                this.setCurrent(this.users[0]);
                                this.setFirstLine = false;
                            }
                            if (typeof callback === 'function') {
                                callback();
                            }
                        }
                    }
                ).catch(err => {
                that.loading = false;
                that.$message.error({
                    showClose: true,
                    message: err.toString(),
                    duration: 2000
                });
            })
        },
        setCurrent(row) {
            console.log(row);
            this.$refs.usersTable.setCurrentRow(row);
        },
        deleteReport(row, accessible) {
            this.$confirm(`此操作将${accessible ? '恢复' : '删除'}该报告, 是否继续?`, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                API.deleteReport(row.record_id, {accessible: accessible}).then(() => {
                    this.$message({
                        type: 'success',
                        message: accessible ? '恢复成功！' : '删除成功!'
                    });
                    this.handleSearch(null, true);
                })
            }).catch(() => {

            })
        },
        deleteReportReal(row) {
            this.$confirm('此操作将永久删除该报告, 是否继续?', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                API.deleteReportReal(row.record_id).then(() => {
                    this.$message({
                        type: 'success',
                        message: '删除成功！'
                    });
                    this.handleSearch(null, true);
                })
            }).catch(() => {

            })
        },
        reset() {
            this.$refs.searchReportsForm.resetFields();
            this.filters = {
                name: "",
                report_states: this.initReportState,
                reportTimeSelected: '',
                hospital_id: '',
                hospital_label: '',
                id: '',
                sort: 'RECORD_TIME',
                sort_state: 'DOWN'
            };
            bus.$emit('resetExpandTree');
            this.$refs.usersTable.clearSort();
            this.handleSearch();
        },
        clearSelectedHospital() {
            this.filters.hospital_id = '';
            this.filters.hospital_label = '';
            this.handleSearch();
        },
        tableSort({column, prop, order}) {
            this.filters.sort = this.sortNameMap[prop];
            this.filters.sort_state = this.sortOrderMap[order];
            this.page = 1;
            this.handleSearch();
        },
        findDefaultSort(sort, data) {
            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    if (data[key] === sort) {
                        return key
                    }
                }
            }
        },
        selectedHospital(val) {
            this.filters.hospital_id = val.id;
            this.filters.hospital_label = val.label;
            this.handleSearch();
        },
        getHospitals() {
            this.getHospitalLoading = true;
            API.getInstitutions({
                showReportCount: true
            }).then(res => {
                this.treeData = res;
            }).finally(() => {
                this.getHospitalLoading = false;
            })
        },
        namePlusHospital(name, hospital) {
            if (hospital) {
                return name + '(' + hospital + ')';
            } else {
                return name
            }
        },
        exportExcel() {
            let excelSrc = `/user/export_excel/?name=${this.filters.name}&id=${this.filters.id}&hospital_id=${this.filters.hospital_id}&sort=${this.filters.sort}&sort_state=${this.filters.sort_state}`;
            switch (this.filters.report_states) {
                case 'ALL':
                case 'UPLOADER_ALL':
                    break;
                case 'DELETED':
                    excelSrc += '&accessible=false';
                    break;
                default:
                    excelSrc += `&report_states=${this.filters.report_states}`;
            }
            if (this.filters.reportTimeSelected !== null) {
                if (this.filters.reportTimeSelected[1]) {
                    let endDate = new Date(this.filters.reportTimeSelected[1] + ':00');
                    endDate.setMinutes(endDate.getMinutes() + 1);
                    excelSrc += `&start_time=${this.filters.reportTimeSelected[0]}:00&end_time=${Util.formatTimeM(endDate)}`
                }
            }
            window.open(excelSrc);
        },
        finishReport(row) {
            this.$confirm('确认归档此报告？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                this.finishReportId = row.record_id;
                this.finishReportLoading = true;
                APIReport.revokeReportAuditing({
                    record_id: row.record_id,
                    state: 'FINISH'
                })
                    .then(data => {
                        this.search();
                    })
                    .catch(_ => {
                        this.search();
                    }).finally(() => {
                    this.finishReportLoading = false;
                })
            })
        }
    },
    beforeDestroy() {

    },
    mounted() {
        if (this.saveFilters !== null) {
            this.filters.report_states = this.saveFilters.report_states
        } else {
            this.filters.report_states = this.initReportState
        }
    }
};