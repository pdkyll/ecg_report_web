import API from "../../src/api/api_user";
import Util from '../../src/common/util';

export default {
    data() {
        return {
            assignTreeData: [],
            assignGetHospitalLoading: false,
            assignTableSortMap: {
                doctorNickName: 'NAME',
                workNum: 'WORK_NUM',
                institutionName: 'HOSPITAL'
            },
            assignSortOrderMap: {
                ascending: 'UP',
                descending: 'DOWN'
            },
            form: {
                name: "",
                user_id: "",
                searchInstitutionId: "",
                assignTableSort: {
                    sort: 'WORK_NUM',
                    sortState: 'DOWN'
                },
            },
            gridData: [],
            dialogTableVisible: false,
            institutionId: 0,
        }
    },
    computed: {},
    watch: {},
    methods: {
        clearAssignSelectedHospital() {
            this.form.searchInstitutionId = '';
            this.handleDoctorSearch();
        },
        selectAssignHospital(val) {
            this.form.searchInstitutionId = val.id;
            this.handleDoctorSearch();
        },
        assignGetHospitals() {
            this.assignGetHospitalLoading = true;
            API.assignGetHospital({
                institutionId: this.institutionId,
                userType:'ROLE_EDITOR'
            }).then(res => {
                this.assignTreeData = res;
            }).finally(() => {
                this.assignGetHospitalLoading = false;
            })
        },
        assignTableSort({column, prop, order}) {
            this.form.assignTableSort.sort = this.assignTableSortMap[prop];
            this.form.assignTableSort.sortState = this.assignSortOrderMap[order];
            this.handleDoctorSearch();
        },
        assignDoctorClick(row) {
            this.form.user_id = row.record_id;
            this.institutionId = row.institution_id;
            this.handleDoctorSearch();
            this.dialogTableVisible = true;
        },
        assignDoctor(index, row) {
            let params = {
                record_id: this.form.user_id,
                doctor_id: row.doctorId
            };
            API.assisgnDoctor(params).then((result) => {
                this.$message.success({
                    showClose: true,
                    message: "分配成功",
                    duration: 1500
                });
                this.search();
                this.dialogTableVisible = false;
            });
        },
        handleDoctorSearch() {
            let params = {
                institutionId: this.institutionId,
                namePattern: this.form.name.replace(/^(\s+)|(\s+)$/, ''),
                excludeDisabled: true,
                searchInstitutionId: this.form.searchInstitutionId,
                sort: this.form.assignTableSort.sort,
                sortState: this.form.assignTableSort.sortState
            };
            API.getAssociatedUsers(params).then((result) => {
                this.gridData = result;
            });
        },
        closeAssignDialog() {
            this.$refs.assignTree.reset();
            this.$refs.assignTable.clearSort();
            this.form = {
                name: "",
                user_id: "",
                searchInstitutionId: "",
                assignTableSort: {
                    sort: 'WORK_NUM',
                    sortState: 'DOWN'
                },
            };
        }
    },
    beforeDestroy() {

    },
    mounted() {

    }
}