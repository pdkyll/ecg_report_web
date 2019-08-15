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
                        <!--<el-radio-button label="8">心律失常</el-radio-button>-->
                    </el-radio-group>
                    <el-button type="primary" @click="reloadPdf" style="margin-left: 10px" v-if="userType !== -1">查看PDF</el-button>
                    <el-button type="primary" v-if="userType===0"
                               :disabled="basicInfo.state !== 'EDITING' && basicInfo.state !== 'WAIT_FOR_EDIT'"
                               @click="submitReport()">
                        提交报告
                    </el-button>
                    <el-button type="primary"
                               v-if="userType===3 && basicInfo.state === 'AUDITING'"
                               @click="auditReport()">审核报告
                    </el-button>
                </div>
                <div>
                    <ScatterHeader
                            v-show="tabSelect !== '1' && tabSelect !== '0' && tabSelect !== '7'"
                    />
                    <keep-alive>
                        <component v-bind:is="currentTabComponent" :selectHour="selectHour"
                                   :firstEcgPos="firstEcgPos" :dates="dateStatistics" ref="ecgViewPage"></component>
                    </keep-alive>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import DetailedPatientInfo from '../../components/ecgView/DetailedPatientInfo.vue';
    import EcgViewContent from '../../components/ecgView/EcgViewContent.vue';
    import scatterView from '../../views/ScatterView.vue';
    import histogramView from '../../views/HistogramView.vue';
    import EcgReport from '../../views/EcgReport.vue';
    import AFView from '../../views/AFView.vue';
    import OverlayView from '../../views/OverlayView.vue';
    import tempCorrection from '../../views/tempCorrection.vue'
    import Arrhythmia from '../../views/Arrhythmia.vue';
    import API from '../../api/api_ecg_view';
    import {bus} from '../../bus';
    import Util from '../../common/util';
    import APIReport from '../../api/api_report';
    import APIUser from '../../api/api_user';
    import ScatterHeader from '../../components/commonBlock/CommonHeader';
    import axios from 'axios';
    import Cookies from 'js-cookie'

    export default {
        name: 'independentAuditor',
        components: {
            DetailedPatientInfo,
            EcgViewContent,
            scatterView,
            histogramView,
            EcgReport,
            AFView,
            Arrhythmia,
            tempCorrection,
            OverlayView,
            ScatterHeader
        },
        data() {
            return {
                dialogLeave: false,
                tabContentComponentArr: [DetailedPatientInfo, EcgViewContent, scatterView, histogramView, AFView, OverlayView, tempCorrection, EcgReport,Arrhythmia],//存储导航页面组件
                currentTabComponent: EcgViewContent,
                mainLoading: false,
                firstLoading: true,
                lastSelectDate: '',
                dialogVisible: false,
                showConfirmButton: false,
                showCancelButton: false,
                reAnalystLoading: false,
                num: 0,
                tabSelect: '1',
                selectHour: 0,//初次加载的心电当前小时
                firstEcgPos: 0,//初次记载的心电索引
                dateStatistics: [],//心电主页日期卡片统计信息
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
                basicInfo: state => state.basicInfo,
                currentDate: state => state.currentDate,
                validDates: state => state.validDates,
                perDateData: state => state.perDateData,
                pageChanged: state => state.pageChanged,
                mainPageLoading: state => state.mainPageLoading,
                datesIsContainData: state => state.datesIsContainData,
                ecgDataLoading: state => state.ecgDataLoading,
                samplingFrequency: state => state.samplingFrequency,
                inPic: state => state.inPic,
                selectMain: state => state.selectMain,
                tagChangeState: state => state.tagChangeState,
                selectComponent: state => state.selectComponent
            }),
            ...mapState('ecgDayCards', {
                dates: state => state.dates,
                getEcgDatesLoading: state => state.getEcgDatesLoading
            }),
            userType() {
                return JSON.parse(localStorage.getItem('access-user')).userType
            },
//            scopeRow() {
//                return JSON.parse(localStorage.getItem('scope_row'))
//            },
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
        },
        mounted() {
            this.initWebsocket();
            let that = this;
            that.changeSelectComponent('main');
            bus.$off('reAnalystLoading');
            bus.$on('reAnalystLoading', (state) => {
                this.reAnalystLoading = state;
            });
            this.changeEcgDataLoading(true);
            //===重构新增===
            axios.all([API.getValidDates({
                report_id: this.report_id
            }), API.getLastBlockIndex({
                report_id: this.report_id
            }), API.getDayStartEcg({
                report_id: this.report_id,
                block_index: 0
            }), API.getBasicInfo({
                report_id: this.report_id
            }), API.getHeartRates({
                report_id: this.report_id
            }), API.getEcgDates({
                report_id: this.report_id
            })])
                    .then(axios.spread((data, lastBlockIndex, dayStartIndex, basicInfo, heartRates, dates) => {
                        this.changeValidDates(data.timeArray);
                        this.changeDateIndex(Util.firstExistDataIndex(this.datesIsContainData));
                        this.changeBasicInfo(basicInfo);
                        this.changeHeartRates(heartRates);
                        this.changeEcgStartTime(basicInfo.recordTime);
                        this.changeEcgEndTime(basicInfo.recordEndTime);
                        this.changeStartBlockIndex(dayStartIndex)
                        let tempCurrentDate = new Date(basicInfo.recordTime);
                        tempCurrentDate.setMinutes(tempCurrentDate.getMinutes() + dayStartIndex);
                        this.selectHour = tempCurrentDate.getHours();
                        this.changeCurrentDate(Util.formatTimeM(tempCurrentDate).split(' ')[0] + ' 00:00:00');
                        this.changeLastBlockIndex(lastBlockIndex);
                        this.firstEcgPos = this.samplingFrequency * 60 * dayStartIndex;
                        this.dateStatistics = dates;
                    })).finally(() => {
                this.changeEcgDataLoading(false);
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
                'changeStartBlockIndex',
                'changeJumpPosition',
                'changeMainState',
                'changeFastDataLoading',
                'changeSelectMain',
                'changeSelectComponent',
                'changeValidDates',
                'changeCurrentDate',
                'changePerDayData',
                'clearPerData',
                'changeInPic',
                'resetEcgViewModule',
                'changeGainSelected',
                'changeEcgStartTime',
                'changeEcgEndTime',
                'changeBasicInfo',
                'changeLastBlockIndex',
                'changeEcgDataLoading',
                'changeTagState',
                'changePerDayData',
                'changeViewLoadingState',
                'changeUpdateTagQState2',
                'changeDateIndex',
            ]),
            ...mapMutations('paperBlock', [
                'changeType'
            ]),
            ...mapMutations('afView', [
                'resetAfViewModule'
            ]),
            ...mapMutations('ecgDayCards', [
                'resetEcgDayCardModule',
            ]),
            ...mapMutations('ecgDrag', [
                'resetEcgDragModule',
                'changeHeartRates'
            ]),
            changeShowComponent({position = -1, statu = false}) {
                let types = ['main', 'scatter', 'lineBlock', 'afView', 'overlay', 'block', 'report','arrhythmia'];
                let index = Number(this.tabSelect);
                if (index !== 1) {
                    this.changeSelectMain(false);
                } else {
                    this.changeSelectMain(true);
                }
                this.changeType(types[index - 1]);
                this.currentTabComponent = this.tabContentComponentArr[index];
                this.changeSelectComponent(types[index - 1]);
                // changeInPic
                if (index !== 7) {
                    this.changeInPic(false);
                }
                if (position !== -1 && types[index - 1] === 'main') {
                    let obj = {position: position, statu: statu}
                    this.$nextTick(() => {
                        this.$refs.ecgViewPage.handleJump(obj)
                    })
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
                        record_id: this.report_id,
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
                    record_id: this.report_id,
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
                        })
                        .catch((err) => {
                            that.$message.error('通过失败');
                        });
            },
            cancelReport() {
                let params = {
                    record_id: this.report_id,
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
                        })
                        .catch((err) => {
                            that.$message.error('驳回失败');
                        });
            },
            /**
             * 更新数据，这里只发送页面发生变化的状态通知，具体的数据更新在组件内部，这样可以避免多次重绘
             * @param date
             */
            changeScatterAndLineBlockData(date) {
                if (!this.selectMain) this.changeViewLoadingState(true);
                clearTimeout(this.fangdouTimer);
                this.fangdouTimer = setTimeout(async () => {
                    if (this.perDateData[date] !== undefined) {
                        let freshStateArray = new Array(this.tagChangeState.length).fill(true);
                        this.changeTagState(freshStateArray);
                    }
                }, 0);
            },
            //            初始化websorcket
            initWebsocket() {
                this.websocket = new ReconnectingWebSocket(Util.wsUrl.local);
                this.websocket.onopen = this.websocketOnOpen;
                this.websocket.onmessage = this.websocketOnMessage;
                var registerHeartBeat = () => {
                    setTimeout(
                            () => {
                                if (this.websocket) {
                                    this.websocket.send(JSON.stringify({
                                        type: 'HEARTBEAT',
                                        userId: JSON.parse(localStorage.getItem('access-user')).user_id
                                    }));
                                    registerHeartBeat()
                                }
                            },
                            10 * 1000
                    );
                };
                registerHeartBeat();
            },
            websocketOnOpen() {   //websocket连接
                console.log('连接成功');
                const obj = {
                    reportId: this.report_id,
                    type: 'SUBSCRIBE_REPORT',
                    userId: JSON.parse(localStorage.getItem('access-user')).user_id
                };
                this.websocket.send(JSON.stringify(obj));
            },
            websocketOnMessage(e) { //websocket获取数据
                const request = JSON.parse(e.data);
                console.log('收到信号', request);
                if (request.type === 'REPORT_DELETED' && JSON.parse(localStorage.getItem('access-user')).role !== 'ROLE_SUPER_ADMINISTRATOR' && JSON.parse(localStorage.getItem('access-user')).role !== 'ROLE_ADMINISTRATOR') {
                    this.dialogVisible = false
                    $('.submit-cancel-btn').trigger('click')
                    this.$alert('该报告已删除', '警告', {
                        confirmButtonText: '确定',
                        type: 'warning',
                        showClose: false,
                        closeOnPressEscape: false,
                        closeOnClickModal: false,
                        callback: action => {
                            this.$router.go(-1);
                        }
                    })
                }
                if (request.type === 'STATISTIC_CHANGED') {
                    bus.$emit('getRecordInfo');
                    if(this.selectComponent === 'main'){
                        this.$refs.ecgViewPage.updateDayCards();
                    }
                }
                if (request.type === 'SLICE_CHANGED') {
                    if (!this.inPic) {
                        bus.$emit('getUsePicData');
                    }
                    if (this.selectComponent === 'main') {
                        bus.$emit('changeCurrentAbnormalList');
                        this.$refs.ecgViewPage.refreshHeartRate();
                        this.changeUpdateTagQState2(true);
                    }
                    if (this.selectComponent !== 'main') {
                        this.changeMainState(true)
                    }
                    this.$refs.ecgViewPage.updateTags();
                }
                if (request.type === 'VOLTAGE_CHANGED') {
                    let freshStateArray = new Array(this.tagChangeState.length).fill(true);
                    this.changeTagState(freshStateArray);
                    if (this.selectComponent !== 'main') {
                        this.changeMainState(true)
                    }
                    this.$refs.ecgViewPage.updateVisibleData();
                }
                if (request.type === 'REPORT_TAG_RANGE_CHANGE') {
                    if (request.subType === 'RULE_RHYTHMS') {
                        // let freshStateArray = new Array(this.tagChangeState.length).fill(true);
                        // this.changeTagState(freshStateArray);
                    }
                }
                if (request.type === 'BLOCK_CHANGED') {
                    bus.$emit('updateSavedAFRhythmTable')
                }
                if (request.type === 'REPORT_COMMITTED') {
                    if (this.userType === 0) {
                        this.$router.push({path: "/doctor/patientList"});
                    }
                }
                if (request.type === 'REPORT_TAG_RANGE_CHANGE') {
                    let date = this.currentDate.split(' ')[0].replace(/\//g, '-');
                    if (request.subType === 'BEATS') {
                        /**
                         * 防抖，防止多次计算
                         */
                        this.changeScatterAndLineBlockData(date)
                        // }
                    }
                }
            },
        },
        beforeDestroy() {
            bus.$off();
            $('.tab-left').off();
            this.resetEcgViewModule(['gainSelected', 'selectMain', 'tagChangeState','samplingFrequency','redrawState','jumpPosition']);
            this.changeGainSelected(10);//恢复默认增益选项
            this.resetAfViewModule();
            this.resetEcgDayCardModule();
            this.resetEcgDragModule();
            let ws = this.websocket;
            if (ws) {
                this.websocket = null;
                ws.close();
            }
            Cookies.remove('SESSION', {SameSite: "Lax"});
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
