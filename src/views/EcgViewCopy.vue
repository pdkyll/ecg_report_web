<template>
    <div class="ecg-view-box-wrap" v-loading="reAnalystLoading" element-loading-text="重新AI分析中">
        <el-dialog
                title="确定完成当前报告的审核"
                :visible.sync="dialogVisible"
                width="400px"
                center
        >
            <div style="width: 200px; margin: 0 auto; display: flex;justify-content: space-around">
                <el-button @click="cancelReport">驳回</el-button>
                <el-button type="primary" @click="confirmReport">通过</el-button>
            </div>
        </el-dialog>
        <div class="ecg-view-box" v-loading="ecgViewLoading" element-loading-text="数据分析中"
             element-loading-background="rgba(0, 0, 0, 0.8)">
            <div class="ecg-view-content" v-loading="wholeViewLoading" element-loading-background="rgba(0, 0, 0, 0.8)">
                <div style="box-sizing: border-box;padding: 6px 10px;background-color: #e2e2e2;border-radius: 3px;margin-bottom: 6px">
                    <el-radio-group v-model="tabSelect" @change="changeShowComponent">
                        <el-radio-button label="0">患者基本信息</el-radio-button>
                        <el-radio-button label="1">整体报告展示</el-radio-button>
                        <el-radio-button label="2">散点图修正</el-radio-button>
                        <el-radio-button label="3">直方图修正</el-radio-button>
                        <el-radio-button label="4">房扑房颤</el-radio-button>
                        <el-radio-button label="5">叠加图</el-radio-button>
                        <el-radio-button label="6">模板修正</el-radio-button>
                        <el-radio-button label="7">统计分析</el-radio-button>
                    </el-radio-group>
                    <el-button type="primary" @click="reloadPdf" style="margin-left: 10px">查看PDF</el-button>
                    <el-button type="primary" v-if="userType===0"
                               :disabled="scopeRow.report_state !== 'EDITING' && scopeRow.report_state !== 'WAIT_FOR_EDIT'"
                               @click="submitReport(scopeRow)">
                        提交报告
                    </el-button>
                    <el-button type="primary"
                               v-if="userType===3 && scopeRow.report_state === 'AUDITING'"
                               @click="auditReport(scopeRow)">审核报告
                    </el-button>
                </div>
                <div>
                    <ScatterHeader
                            v-show="tabSelect !== '1' && tabSelect !== '0' && tabSelect !== '7'"
                    />
                    <keep-alive>
                        <component v-bind:is="currentTabComponent"></component>
                    </keep-alive>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import DetailedPatientInfo from '../components/ecgView/DetailedPatientInfo.vue';
    import EcgViewContent from '../components/ecgView/EcgViewContent.vue';
    import scatterView from './ScatterView.vue';
    import histogramView from './HistogramView.vue';
    import EcgReport from './EcgReport.vue';
    import AFView from './AFView.vue';
    import OverlayView from './OverlayView.vue';
    import tempCorrection from './tempCorrection.vue'
    import API from '../api/api_ecg_view';
    import {bus} from '../bus';
    import Util from '../common/util';
    import APIReport from '../api/api_report';
    import APIUser from '../api/api_user';
    import ScatterHeader from '../components/commonBlock/CommonHeader';

    export default {
        name: 'EcgView',
        components: {
            DetailedPatientInfo,
            EcgViewContent,
            scatterView,
            histogramView,
            EcgReport,
            AFView,
            tempCorrection,
            OverlayView,
            ScatterHeader
        },
        data() {
            return {
                dialogLeave: false,
                tabContentComponentArr: [DetailedPatientInfo, EcgViewContent, scatterView, histogramView, AFView, OverlayView, tempCorrection, EcgReport],//存储导航页面组件
                currentTabComponent: EcgViewContent,
                mainLoading: false,
                firstLoading: true,
                lastSelectDate: '',
                dialogVisible: false,
                showConfirmButton: false,
                showCancelButton: false,
                reAnalystLoading: false,
                num: 0,
                tabSelect: '1'
            }
        },
        beforeRouteLeave(to, from, next) {
            this.changeFastData([]);
            this.clearPerData({});
            this.changeCurrentDate('');
            next();
        },
        computed: {
            ...mapState('ecgView', {
                wholeViewLoading: state => state.wholeViewLoading,
                currentDate: state => state.currentDate,
                validDates: state => state.validDates,
                pageChanged: state => state.pageChanged,
                mainPageLoading: state => state.mainPageLoading,
                datesIsContainData: state => state.datesIsContainData,
                ecgDataLoading: state => state.ecgDataLoading,
            }),
            ...mapState('ecgDayCards', {
                dates: state => state.dates,
                getEcgDatesLoading: state => state.getEcgDatesLoading
            }),
            userType() {
                return JSON.parse(localStorage.getItem('access-user')).userType
            },
            scopeRow() {
                return JSON.parse(localStorage.getItem('scope_row'))
            },
            doctor_id() {
                return JSON.parse(localStorage.getItem('access-user')).id
            },
            iframeSrc() {
                return window.location.protocol + '//' + window.location.hostname + '/pdf/generate/?report_id=' + localStorage.getItem('report_id');
            },
            ecgViewLoading() {
                return this.mainLoading || this.ecgDataLoading || this.getEcgDatesLoading
            },
            report_id() {
                return localStorage.getItem('report_id');
            }
        },
        created() {
            bus.$off('closeSubmitComfirm')
            bus.$on('closeSubmitComfirm', () => { // 当删除报告的websocket来的时候隐藏审核报告的弹窗和提交报告的弹窗
                this.dialogVisible = false
                $('.submit-cancel-btn').trigger('click')
            })
        },
        mounted() {
            let that = this;
            that.changeSelectComponent('main');
            bus.$off('jumpToMain');
            bus.$on('jumpToMain', (callBack) => {
                this.changeSelectMain(true);
                this.tabSelect = '1';
                this.changeInPic(false);
                this.currentTabComponent = this.tabContentComponentArr[1];
                callBack();
            });
            bus.$off('reAnalystLoading');
            bus.$on('reAnalystLoading', (state) => {
                this.reAnalystLoading = state;
            });
            API.getValidDates({
                report_id: localStorage.getItem('report_id')
            }).then((data) => {
                this.changeValidDates(data.timeArray);
                this.changeDateIndex(Util.firstExistDataIndex(this.datesIsContainData));
            });
        },
        watch: {
            currentDate() {
                this.lastSelectDate = this.currentDate.split(' ')[0].replace(/\//g, '-');
            }
        },
        methods: {
            ...mapActions('ecgView', [
                'changeVSTagData',
            ]),
            ...mapMutations('ecgView', [
                'changeFastData',
                'changeFastDataLoading',
                'changeSelectMain',
                'changeSelectComponent',
                'changeValidDates',
                'changeCurrentDate',
                'clearPerData',
                'changeInPic',
                'resetEcgViewModule',
                'changeGainSelected',
            ]),
            ...mapMutations('paperBlock', [
                'changeType'
            ]),
            ...mapMutations('afView', [
                'changeDateIndex',
                'resetAfViewModule'
            ]),
            ...mapMutations('ecgDayCards', [
                'resetEcgDayCardModule'
            ]),
            ...mapMutations('ecgDrag', [
                'resetEcgDragModule'
            ]),
            changeShowComponent() {
                let types = ['scatter', 'lineBlock', 'afView','overlay', 'block', 'report'];
                let index = Number(this.tabSelect);
                if (index !== 1) {
                    this.changeSelectMain(false);
                } else {
                    this.changeSelectMain(true);
                }
                this.changeType(types[index - 2]);
                this.currentTabComponent = this.tabContentComponentArr[index];
                this.changeSelectComponent(types[index - 2]);
                // changeInPic
                if (index !== 7) {
                    this.changeInPic(false);
                }
            },
            reloadPdf() {
                let report_id = localStorage.getItem('report_id');
                let url = `/pdf/${report_id}/status`;
                let that = this;
                $.ajax({
                    url: url,
                    type: 'get',
                    async: false,
                    success: function (data) {
                        if (data.isReady) {
                            window.open(that.iframeSrc, '_blank');
                        } else {
                            that.$message.error('数据正在计算中，请稍后重试');
                        }
                    },
                    fail: function () {
                        that.$message.error('数据正在计算中，请稍后重试');
                    }
                })
            },
            submitReport(val) {
                this.$confirm('确定要提交此报告?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    cancelButtonClass: 'submit-cancel-btn',
                    type: 'warning'
                }).then(() => {
                    let that = this;
                    let params = {
                        record_id: val.record_id,
                        state: 'AUDITING'
                    };
                    APIReport.revokeReportAuditing(params)
                        .then(() => {
                            that.$message.success("提交报告成功,自动跳转到病人列表页面！");
                            if (this.userType === 0) {
                                this.$router.push({path: "/doctor/patientList"});
                            } else if (this.userType === 3) {
                                this.$router.push({path: "/auditor/patientList"});
                            }
                            localStorage.setItem('scope_row', '');
                        })
                        .catch(() => {
                            that.$message.error("提交报告失败");
                        })
                }).catch(() => {

                });
            },
            auditReport(val) {
                this.dialogVisible = true;
            },
            confirmReport() {
                let params = {
                    record_id: this.scopeRow.record_id,
                    state: 'AUDIT_PASS'
                };
                APIReport.revokeReportAuditing(params)
                    .then(() => {
                        this.$message({
                            message: '通过成功,自动跳转到病人列表页面！',
                            type: 'success'
                        });
                        if (this.userType === 0) {
                            this.$router.push({path: "/doctor/patientList"});
                        } else if (this.userType === 3) {
                            this.$router.push({path: "/auditor/patientList"});
                        }
                        localStorage.setItem('scope_row', '');
                    })
                    .catch((err) => {
                        that.$message.error('通过失败');
                    });
            },
            cancelReport() {
                let params = {
                    record_id: this.scopeRow.record_id,
                    state: 'EDITING'
                };
                APIReport.revokeReportAuditing(params)
                    .then((result) => {
                        this.$message({
                            message: '驳回成功,自动跳转到病人列表页面！',
                            type: 'success'
                        });
                        if (this.userType === 0) {
                            this.$router.push({path: "/doctor/patientList"});
                        } else if (this.userType === 3) {
                            this.$router.push({path: "/auditor/patientList"});
                        }
                        localStorage.setItem('scope_row', '');
                    })
                    .catch((err) => {
                        that.$message.error('驳回失败');
                    });
            }
        },
        beforeDestroy() {
            bus.$off();
            $('.tab-left').off();
            this.resetEcgViewModule(['gainSelected', 'ecgChangeDirectionNext', 'selectMain', 'tagChangeState']);
            this.changeGainSelected(10);//恢复默认增益选项
            this.resetAfViewModule();
            this.resetEcgDayCardModule();
            this.resetEcgDragModule();
        },
        destroyed() {

        }
    }
</script>
<style>
    .ecg-view-box-wrap .el-dialog__header {
        padding: 20px 20px 20px;
    }
</style>
<style scoped lang="scss">
    .flexBox1 /deep/ .el-button + .el-button {
        margin-left: 0 !important;
    }

    .ecg-view-box {
        box-sizing: border-box;
        width: 1570px;
        margin: auto;
    }

    .ecg-view-content {
        /*display: flex;*/
        margin-top: 10px;
        width: 100%;
    }

    .left-content {
        background-color: #e4e4e4;
        margin-right: 10px;
        height: 860px;
        position: relative;
        box-shadow: #dbdbdb 0 0 10px;
    }

    .tab-left {
        cursor: pointer;
        width: 150px;
    }

    .tab-left > div {
        background-color: #cbcbcb;
        text-align: center;
        height: 60px;
        line-height: 60px;
    }

    .tab-left > div:hover {
        background-color: #bfbfbf;
    }

    .active {
        background-color: #fff !important;
        box-shadow: #e7e7e7 0 0 10px;
    }

    .report_submit {
        position: absolute;
        bottom: 100px;
        left: 26px;
    }

    .report_submit > div {
        margin-bottom: 20px;
    }

    .tab-content {
        box-shadow: #dbdbdb 0 0 10px;
        padding: 10px;
    }

    .flexBox {
        display: flex;
        justify-content: space-around;
        flex-direction: column;
        margin-top: 40px;
    }

    .ecg-view-box-wrap {
        margin-left: calc(100vw - 100%);
    }

</style>
