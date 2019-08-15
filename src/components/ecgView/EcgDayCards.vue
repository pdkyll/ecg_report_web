<template>
    <div class="ecg-day-cards" ref="ecgDayCards">
        <el-card v-for="(date,index) in dates" :key="date.date" class="box-card" body-style="padding:0"
                 v-show="datesIsContainData[index]"
        >
            <div class="box-card-content" style="padding: 10px;position: relative" :class="{active:index===dateIndex}">
                <span class="fixbutton" @click="deletePieceData" v-if="!reportDisable">×</span>
                <div style="font-weight: bold">
                    {{date.date.split(' ')[0]}}
                </div>
                <div class="beats-abnormal">
                    <p><span class="abnormal-type">N:</span><span>{{date.beatsAbnormal.N}}</span></p>
                    <p><span class="abnormal-type">V:</span><span>{{date.beatsAbnormal.V}}</span></p>
                    <p><span class="abnormal-type">S:</span><span>{{date.beatsAbnormal.S}}</span></p>
                    <p><span class="abnormal-type">Q:</span><span>{{date.beatsAbnormal.Q}}</span></p>
                    <!--<p><span class="abnormal-type">F:</span><span>{{date.beatsAbnormal.F}}</span></p>-->
                </div>
                <div class="rhythms-abnormal">
                    <p><span class="abnormal-type">室性：</span><span>{{date.rhythmsAbnormal.VT}}</span></p>
                    <p><span class="abnormal-type">室上性：</span><span>{{date.rhythmsAbnormal.SA}}</span></p>
                    <p><span class="abnormal-type">房颤：</span><span>{{date.rhythmsAbnormal.AF}}</span></p>
                </div>
            </div>
            <div class="events-list" v-show="eventsListShow" v-if="index===dateIndex">
                <el-select v-model="selectedAbnormal" clearable @change="changeAbnormalTypeList">
                    <el-option
                            v-for="item in abnormalTypes"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value">
                    </el-option>
                </el-select>
                <el-table ref="eventTable" :data="tableData" :cell-style="{padding:5}" :highlight-current-row="true"
                          v-loading="listLoading"
                          @row-click="eventsTableRowClick">
                    <el-table-column
                            prop="typeName"
                            label="事件"
                            width="70"
                    >
                    </el-table-column>
                    <el-table-column
                            prop="datetime"
                            label="时间"
                            width="80"
                    >
                        <template slot-scope="scope">
                            <div>
                                {{scope.row.datetime.split(' ')[1]}}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                            prop="checked"
                            label="留图"
                            width="50"
                    >
                        <template slot-scope="scope" v-if="scope.row.label!=='NOISE'">
                            <el-switch
                                    v-model="scope.row.checked"
                                    active-color="#13ce66"
                                    inactive-color="#ccc"
                                    @change="useReport(scope.row)"
                            >
                            </el-switch>
                        </template>
                    </el-table-column>
                </el-table>
                <div class="event-page-operate" @click.stop>
                    <el-button size="mini" round style="margin-right: 20px;margin-left: 10px"
                               @click="changeCurrentEventPage(false)" :disabled="currentEventPage===0">上一页
                    </el-button>
                    <el-button size="mini" round @click="changeCurrentEventPage(true)"
                               :disabled="currentEventPage===pageNum">下一页
                    </el-button>
                </div>
                <div class="events-total">
                    总计：{{eventsTotal}}条
                </div>
            </div>
        </el-card>
    </div>
</template>

<script>
    import API from '../../api/api_ecg_view';
    import {mapActions, mapState, mapMutations} from 'vuex';
    import {bus} from '../../bus';
    import Util from '../../common/util';

    export default {
        name: 'EcgDayCards',
        props: {
            dates: {
                type: Array,
                default: []
            }
        },
        data() {
            return {
                abnormalTypes: [],
                selectedAbnormal: '',//当前事件列表的异常类型
                listLoading: false,
                reportDisable: false,
                tableData: [{
                    abnormal_type: 1,
                    datetime: '2017/12/21 07:50:12',
                    length: 3431,
                    checked: true,
                    label: 'MAXHR',
                    position: 498089,
                    typeName: ''
                },
                ],
                useState: false,
                limit: 8,//当天事件下拉列表每页显示的条数
                currentEventPage: 0,
                eventsTotal: 0,
                firstLoading: true,
                ondeleteButton: false,
                pickerOptions: {
                    start: '',
                    end: ''
                },
                eventsListShow: false
            }
        },
        methods: {
            ...mapActions('ecgView', ['getDayStartIndex', 'changeVSTagData']),
            ...mapMutations('ecgView', ['changeCurrentDate', 'changeDateIndex','changeStartBlockIndex',
                'changeLastBlockIndex',
                'changeClickDateState', 'changeDateIsContainData', 'changeRhythmTypeSelected', 'changeTagState',
                'changePerDayData', 'changeValidDates']),
            ...mapMutations('ecgDrag', [
                'changeHeartRates'
            ]),
            /**
             * 删除心电片段
             */
            deletePieceData(index) {
                this.ondeleteButton = true;
                this.$confirm('确定要删除此心电片段?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    cancelButtonClass: 'submit-cancel-btn',
                    type: 'warning'
                }).then((action) => {
                    if (action === 'confirm') {
                        let currentDate = this.currentDate.split(' ')[0];
                        let fromTime = currentDate + " " + this.pickerOptions.start + ':00';
                        let endTime = currentDate + " " + this.pickerOptions.end + ':00';
                        if (this.pickerOptions.end === '24:00') {
                            endTime = new Date(new Date(this.currentDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString();
                            endTime = endTime.split('/').map(item => {
                                if (item.length === 1) {
                                    return '0' + item;
                                }
                                return item;
                            }).join('/') + ' ' + '00:00:00';
                        }
                        let index = this.validDates.indexOf(currentDate);
                        let containDateData = Object.assign([], this.datesIsContainData);
                        containDateData[index] = false;
                        this.changeDateIsContainData(containDateData);

                        API.deleteBlocks(this.report_id, {
                            fromTime,
                            reportId: this.report_id,
                            toTime: endTime
                        }).then(data => {
                            let firstValidIndex = Util.firstExistDataIndex(this.datesIsContainData);
                            if (firstValidIndex !== -1) {
                                this.jumpToCard(firstValidIndex);
                            }
                            this.$message.success('删除成功!');
                            this.resetReportStartEnd(fromTime, endTime)
                        })
                    } else {
                        this.ondeleteButton = false;
                    }
                })
            },
            // 判断当前删除的片段是否改变报告的start和end
            resetReportStartEnd(from, end) {
                if (new Date(from).getTime() <= new Date(this.ecgStartTime).getTime() + this.startBlockIndex  * 60 * 1000
                        && new Date(this.ecgStartTime).getTime() + this.startBlockIndex  * 60 * 1000 <= new Date(end).getTime()) {
                    let startBlockIndex = (new Date(end).getTime() - new Date(this.ecgStartTime).getTime()) / 1000/60
                    this.changeStartBlockIndex(startBlockIndex)
                } else if (new Date(from).getTime() <= new Date(this.ecgStartTime).getTime() + this.lastBlockIndex  * 60 * 1000
                        && new Date(this.ecgStartTime).getTime() + this.lastBlockIndex  * 60 * 1000 <= new Date(end).getTime()) {
                    let endBlockIndex = (new Date(end).getTime() - new Date(this.ecgStartTime).getTime()) / 1000/60
                    this.changeLastBlockIndex(endBlockIndex)
                }
            },
            boxCardClickDo(index) {
                this.changeClickDateState(true);
                let currentDateNow = this.dates[index].date;
                this.changeDateIndex(index);
                this.changeCurrentDate(currentDateNow);
                this.upDateChangeState();
                this.getDayStartIndexReq(currentDateNow);
            },
            jumpToCard(index) {
                this.boxCardClickDo(index);
                this.$nextTick(() => {
                    this.eventsListShow = false;
                });
            },
            getDayStartIndexReq(currentDateNow) {
                let blockIndex = 0;
                if (new Date(currentDateNow).getTime() > new Date(this.ecgStartTime).getTime()) {
                    blockIndex = (new Date(currentDateNow).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60;
                }
                this.getDayStartIndex({
                    report_id: this.report_id,
                    block_index: blockIndex
                });
            },
            /**
             * 修改更新状态
             */
            upDateChangeState() {

            },
            eventsTableRowClick(row, event, column) {
                this.$emit('getEventEcg', row);
            },
            getAbnormalList(start, callback) {//参数start代表当天需要显示的事件列表的偏移，如第N页，start=N*limit
                this.listLoading = true;
                let that = this;
                let params = {
                    abnormal_name: that.selectedAbnormal,
                    date: this.currentDate.split(' ')[0],
                    limit: this.limit,
                    report_id: this.report_id,
                    start: start
                };
                API.getAbnormalListByDay(params).then((data) => {
                    this.tableData = data.data.map(v => {
                        let retType = Util.rhythmTranslateMap[v.label] || v.label;
                        if (v.label === 'CUSTOM') {
                            retType = '*' + v.title || retType;
                        }
                        return {
                            ...v,
                            typeName: retType
                        }
                    });
                    this.eventsTotal = data.total;
                    if (callback) {
                        callback();
                    }
                }).finally(() => {
                    this.listLoading = false;
                });
            },
            changeCurrentEventPage(next) {
                if (next) {
                    if (this.currentEventPage < this.pageNum) {
                        this.currentEventPage++;
                        this.getAbnormalList(this.currentEventPage * this.limit);
                    }
                } else {
                    if (this.currentEventPage > 0) {
                        this.currentEventPage--;
                        this.getAbnormalList(this.currentEventPage * this.limit);
                    }
                }
            },
            changeAbnormalTypeList() {
                this.currentEventPage = 0;
                this.getAbnormalList(0);
            },
            useReport(val) {
                this.useState = true;
                let param = {
                    report_id: this.report_id,
                    abnormal_type: 1,
                    position: val.position,
                    label: val.label,
                    state: val.checked ? 1 : null
                };

                API.userSignTagRhythm(param).then((result) => {
                }).catch((err) => {
                    this.$message.closeAll();
                    this.listLoading = false;
                    this.useState = false;
                    this.$message({
                        message: '留图失败！',
                        type: 'error'
                    });
                    this.getAbnormalList(this.currentEventPage * this.limit);
                });
            },
            changeAbnormalTypeMenu(currentDateIndex, callBack) {
                let rhythmsAbnormal = null;
                if (this.dates[currentDateIndex]) {
                    rhythmsAbnormal = this.dates[currentDateIndex].rhythmsAbnormal;
                }
                let tempAbnormalType = [];
                for (let v in rhythmsAbnormal) {
                    if (v !== 'VT' && v !== 'SA') {
                        if (rhythmsAbnormal[v]) {
                            let retType = Util.rhythmTranslateMap[v] || v;
                            if (v === 'CUSTOM') {
                                retType = rhythmsAbnormal[v].title || Util.rhythmTranslateMap[v];
                            }
                            tempAbnormalType.push({
                                label: `${retType}(${rhythmsAbnormal[v]})`,
                                value: v
                            })
                        }
                    }
                }
                this.abnormalTypes = tempAbnormalType;
                if (callBack) callBack();
            },
            calcTimerPicker() {
                let currentDate = this.currentDate.split(' ')[0];
                let startDate = this.ecgStartTime.split(' ')[0];
                let endDate = this.ecgEndTime.split(' ')[0];
                let startTime = this.ecgStartTime.split(' ')[1].slice(0, 5);
                let endTime = this.ecgEndTime.split(' ')[1].slice(0, 5);
                if (currentDate !== startDate) startTime = '00:00';
                if (startDate !== endDate) endTime = '24:00';
                if (currentDate === endDate) endTime = this.ecgEndTime.split(' ')[1].slice(0, 5);
                this.pickerOptions = {
                    start: startTime,
                    end: endTime
                }
            },
        },
        computed: {
            ...mapState('ecgView', {
                basicInfo: state => state.basicInfo,
                ecgStartTime: state => state.ecgStartTime,
                ecgEndTime: state => state.ecgEndTime,
                startBlockIndex: state => state.startBlockIndex,
                lastBlockIndex: state => state.lastBlockIndex,
                ecgChangeDirectionNext: state => state.ecgChangeDirectionNext,
                currentDate: state => state.currentDate,
                dateIndex: state => state.dateIndex,
                clickDateState: state => state.clickDateState,
                validDates: state => state.validDates,
                datesIsContainData: state => state.datesIsContainData,
                tagChangeState: state => state.tagChangeState
            }),
            report_id: function () {
                return localStorage.getItem('report_id');
            },
            pageNum: function () {
                let pageNum = 0;
                if (this.eventsTotal % this.limit === 0) {
                    pageNum = this.eventsTotal / this.limit - 1 < 0 ? 0 : this.eventsTotal / this.limit - 1;
                } else {
                    pageNum = Math.floor(this.eventsTotal / this.limit);
                }
                return pageNum;
            },
        },
        watch: {
            ecgEndTime: function () {
                if (this.ecgEndTime.length) {
                    this.calcTimerPicker();
                }
            },
            dateIndex(currentDateIndex) {
                if (!this.datesIsContainData[currentDateIndex]) {
                    this.$message.closeAll();
                    this.$message({
                        message: '当天没有心电信号，点击左侧卡片切换到其他日期查看！',
                        type: 'warning',
                        duration: 6000
                    });
                    this.eventsListShow = false;
                } else {
                    this.changeAbnormalTypeMenu(currentDateIndex, null);
                    this.currentEventPage = 0;
                    this.selectedAbnormal = '';
                }
                let freshStateArray = new Array(this.tagChangeState.length).fill(true);
                this.changeTagState(freshStateArray);
            },
            currentDate: function (currentDate) {
                this.calcTimerPicker();
                this.getAbnormalList(0);
                this.eventsListShow = !this.firstLoading;
                this.firstLoading = false;
            },
            //日期统计信息
            dates: function (dates) {
                this.changeAbnormalTypeMenu(this.dateIndex, null);//更新下拉菜单
            },
        },
        created() {

        },
        beforeDestroy() {
            bus.$off();
            $('.ecg-day-cards').off();
        },
        mounted() {
            if (this.basicInfo.state === 'FINISH' || this.basicInfo.state === 'AUDIT_PASS') {
                this.reportDisable = true;
            }
            bus.$off('jumpToCard');
            bus.$on('jumpToCard', (index) => {
                this.jumpToCard(index)
            });
            bus.$off('changeCurrentAbnormalList');
            bus.$on('changeCurrentAbnormalList', () => {
                if (this.abnormalTypes.length) {
                    if (!this.useState) {
                        let exist = false;
                        for (let i = 0; i < this.abnormalTypes.length; i++) {
                            if (this.abnormalTypes[i].value === this.selectedAbnormal) {
                                exist = true;
                                break;
                            }
                        }
                        if (!exist) {
                            this.currentEventPage = 0;
                            this.selectedAbnormal = '';
                        }
                        this.getAbnormalList(this.currentEventPage * this.limit)
                    } else {
                        this.useState = false;
                    }
                }
            });
            let self = this;
            $('.ecg-day-cards').on('click', '.box-card', function () {
                if (self.dateIndex === $(this).index()) {
                    self.eventsListShow = !self.eventsListShow;
                } else {//只有点击不同日期卡片时才触发，避免反复点击同一卡片触发相同的接口和逻辑
                    self.boxCardClickDo($(this).index());
                }
            });
            //其他页面，如散点图，切换日期后
            bus.$on('crossPageChangeDateIndex', () => {
                this.firstLoading = true;
                this.changeClickDateState(true);
                this.getDayStartIndexReq(this.currentDate);
            })
        },
        destroyed() {

        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
    .ecg-day-cards .el-table--striped .el-table__body tr.el-table__row--striped.current-row td,
    .ecg-day-cards .el-table__body tr.current-row > td {
        background-color: #d0cbff;
    }

    .ecg-day-cards .el-table--enable-row-hover .el-table__body tr.current-row:hover > td {
        background-color: #d0cbff;
    }

    .events-list .el-table .cell, .el-table th div {
        padding-right: 0;
    }
</style>
<style scoped lang="scss">
    .ecg-day-cards {
        font-size: 14px;
        position: relative;
    }

    .box-card {
        margin-top: 5px;
        cursor: pointer;
    }

    .box-card-content > div {
        position: relative;
        margin-bottom: 5px;
        word-break: break-all;
    }

    .fixbutton {
        position: absolute;
        z-index: 999;
        right: 10px;
        top: 0;
        font-size: 24px;
        cursor: pointer;
    }

    .active {
        border: 1px dashed #f56480;
    }

    .beats-abnormal > span {
        /*margin-right: 5px;*/
    }

    .rhythms-abnormal > span {
        /*margin-right: 5px;*/
    }

    .abnormal-type {
        font-weight: bold;
    }

    .events-list {
        background-color: #fff;
    }

    .event-page-operate {
        margin-top: 5px;
    }

    .events-total {
        font-size: 12px;
        margin-top: 10px;
        text-align: center;
        box-shadow: 5px 5px 5px #dddddd;
    }
</style>
