import {mapState, mapMutations, mapActions} from 'vuex';
import API from "../../src/api/api_user";
import Util from '../../src/common/util';
import {bus} from '../bus';

export default {
    data: function () {
        return {
            loading: false,
            total: 0,
            doctorList: [],
            page: 1,
            limit: 10,
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
                reportTimeSelected: '',
                type: 'ALL',
                sort: 'NAME',
                sort_state: 'UP',
                hospital_id: '',
                disabled: ''
            },
            sortNameMap: {
                doctorName: 'NAME',
                doctorHospital: 'HOSPITAL',
                hospitalCount: 'WORK_HOSPITAL_NUM',
                workNum: 'WORK_NUM',
                userType: 'USER_TYPE',
                disabled: 'USER_STATE',
                lastLoginTime: 'LAST_LOGIN_TIME'
            },
            sortOrderMap: {
                ascending: 'UP',
                descending: 'DOWN'
            },
            userTypeMap: {
                ROLE_EDITOR: '标注医生',
                ROLE_AUDITOR: '审核医生',
                ROLE_UPLOADER: '上传医生'
            },
            treeData: [],
            getHospitalLoading: false,
            userOnline:{
                editorOnlineCount:0,
                auditorOnlineCount:0,
                uploaderOnlineCount:0
            },
        };
    },
    computed: {},
    watch: {},
    methods: {
        handleSearch(callback) {
            this.page = 1;
            this.total = 0;
            this.expands = [];
            this.search(callback);
        },
        //获取用户列表
        search: function (callback) {
            let params = {
                page: this.page,
                limit: this.limit,
                name: this.filters.name,
                hospital_id: this.filters.hospital_id,
                disabled: this.filters.disabled,
                sort: this.filters.sort,
                sort_state: this.filters.sort_state,
                type: this.filters.type === 'ALL' ? '' : this.filters.type,
            };
            if (this.filters.reportTimeSelected) {
                params['start_time'] = this.filters.reportTimeSelected[0] + ':00';
                let endDate = new Date(this.filters.reportTimeSelected[1] + ':00');
                endDate.setMinutes(endDate.getMinutes() + 1);
                params['end_time'] = Util.formatTimeM(endDate);
            }
            this.loading = true;
            API.getDoctors(params)
                .then(
                    (result) => {
                        if (result) {
                            this.doctorList = result.doctorList;
                            this.total = result.totalCount;
                            this.userOnline=result.userOnline;
                            this.$forceUpdate();
                            if (typeof callback === 'function') {
                                callback();
                            }
                        }
                    },
                    (err) => {
                        this.$message.error({
                            showClose: true,
                            message: err.toString(),
                            duration: 2000
                        });
                    }
                )
                .finally(() => {
                    this.loading = false;
                });
        },
        reset() {
            this.filters = {
                name: "",
                reportTimeSelected: '',
                type: 'ALL',
                sort: 'NAME',
                sort_state: 'UP',
                hospital_id: '',
                disabled: ''
            };
            bus.$emit('resetExpandTree');
            this.$refs.usersTable.clearSort();
            this.handleSearch();
        },
        clearSelectedHospital(){
            this.filters.hospital_id = '';
            this.handleSearch();
        },
        tableSort({column, prop, order}) {
            this.filters.sort = this.sortNameMap[prop];
            this.filters.sort_state = this.sortOrderMap[order];
            this.handleSearch();
        },
        selectedHospital(val) {
            this.filters.hospital_id = val.id;
            this.filters.hospital_label = val.label;
            this.handleSearch();
        },
        getHospitals() {
            this.getHospitalLoading = true;
            API.getInstitutions({
                showReportCount: false
            }).then(res => {
                this.treeData = res;
            }).finally(() => {
                this.getHospitalLoading = false;
            })
        }
    },
    beforeDestroy() {

    },
    mounted() {

    }
};