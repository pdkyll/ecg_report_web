<template>
    <div class="ecg-day-cards">
        <el-card v-for="date in dates" :key="date.date" class="box-card" body-style="padding:0"
                 :style="{display:isNullEcgDay(date)?'none':'block'}">
            <div class="box-card-content" style="padding: 10px;position: relative">
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
        </el-card>
        <div class="events-list" style="display: none">
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
            <div class="event-page-operate">
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
    </div>
</template>

<script>
    import API from '../../api/api_ecg_view';
    import {mapActions, mapState, mapMutations} from 'vuex';
    import {bus} from '../../bus';
    import Util from '../../common/util';

    export default {
        name: 'EcgDayCards',
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
                }
            }
        },
        methods: {
            ...mapActions('ecgView', ['getDayStartIndex', 'changeVSTagData']),
            ...mapMutations('ecgView', ['changeCurrentDate', 'changeCurrentDateIndex', 'changeClickDateState', 'changeDateIsContainData', 'changeRhythmTypeSelected', 'changePerDayData', 'changeValidDates']),
            ...mapMutations('ecgDayCards', ['changeDates', 'changeGetEcgDatesLoading']),
            ...mapMutations('ecgDrag', [
                'changeCurMin',
                'changeClickDragState',
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
                        let index = this.validDates.indexOf(currentDate.split('/').join('-'));
                        let containDateData = this.datesIsContainData;
                        containDateData[index] = false;
                        this.changeDateIsContainData(containDateData);
                        API.deleteBlocks(this.report_id, {
                            fromTime,
                            reportId: this.report_id,
                            toTime: endTime
                        }).then(data => {
                            $('.events-list').hide();
                            this.changeHeartRates([]);
                            this.$message.success('删除成功!');
                        })
                    } else {
                        this.ondeleteButton = false;
                    }
                })
            },
            isNullEcgDay(date) {
                let beatsAbnormal = Object.values(date.beatsAbnormal);
                let rhythmsAbnormal = Object.values(date.rhythmsAbnormal);
                for (let i = 0; i < beatsAbnormal.length; i++) {
                    if (beatsAbnormal[i] !== 0) {
                        return false
                    }
                }
                for (let j = 0; j < rhythmsAbnormal.length; j++) {
                    if (rhythmsAbnormal[j] !== 0) {
                        return false
                    }
                }
                return true;
            },
            boxCardClickDo(index, firstMountedState = false) {
                if (firstMountedState) {
                    return;
                }
                this.changeClickDateState(true);
                let currentDateNow = this.dates[index].date;
                this.changeCurrentDateIndex(index);
                this.changeCurrentDate(currentDateNow);
                let blockIndex = 0;
                if (new Date(currentDateNow).getTime() > new Date(this.ecgStartTime).getTime()) {
                    blockIndex = (new Date(currentDateNow).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60;
                }
                this.getDayStartIndex({
                    report_id: this.report_id,
                    block_index: blockIndex
                });
            },
            eventsTableRowClick(row, event, column) {
                bus.$emit('getEventEcg', row);
            },
            getAbnormalList(start) {//参数start代表当天需要显示的事件列表的偏移，如第N页，start=N*limit
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
                    $('.events-list').show();
                });
            },
            changeCurAbnormalList(start) {
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
                    this.listLoading = false;
                    this.tableData = data.data.map(v => {
                        let retType = Util.rhythmTranslateMap[v.label] || v.label;
                        if (v.label === 'CUSTOM') {
                            retType = '*' + v.title || v.label;
                        }
                        return {
                            ...v,
                            typeName: retType
                        }
                    });
                    this.eventsTotal = data.total;
//                    $('.events-list').show();
                }).catch(() => {
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
            changeEventListPos($dom) {
                if ($dom.offset()) {
                    let currentCardTop = $dom.offset().top;
                    let dayCardsTop = $('.ecg-day-cards').offset().top;
                    let currentCardHeight = $dom.height();
                    $('.events-list').css('top', `${currentCardTop - dayCardsTop + currentCardHeight + 5}px`);
                }
            },
            useReport(val) {
                let param;
                this.useState = true;
                if (val.checked) {
                    param = {
                        report_id: this.report_id,
                        abnormal_type: 1,
                        position: val.position,
                        label: val.label,
                        state: 1
                    };
                } else {
                    param = {
                        report_id: this.report_id,
                        abnormal_type: 1,
                        position: val.position,
                        label: val.label
                    };
                }
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
            changeAbnormalList(currentDateIndex, callBack) {
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
            getDates(callback) {
                API.getEcgDates({
                    report_id: this.report_id
                }).then(dates => {
                    this.changeDates(dates);
                    this.changeAbnormalList(this.currentDateIndex, null);
                    if (callback) {
                        setTimeout(() => {
                            callback();
                        }, 200);
                    }
                });
            }
        },

        computed: {
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                ecgEndTime: state => state.ecgEndTime,
                currentDateIndex: state => state.currentDateIndex,
                ecgChangeDirectionNext: state => state.ecgChangeDirectionNext,
                currentDate: state => state.currentDate,
                clickDateState: state => state.clickDateState,
                validDates: state => state.validDates,
                datesIsContainData: state => state.datesIsContainData
            }),
            ...mapState('ecgDayCards', {
                dates: state => state.dates,
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
            currentDateIndex: function (currentDateIndex) {
                $('.box-card').removeClass('active');
                let $currentCard = $('.box-card:eq(' + currentDateIndex + ')');
                $currentCard.addClass('active');
                if ($currentCard.css('display') === 'none') {
                    this.$message.closeAll();
                    this.$message({
                        message: '当天没有心电信号，点击左侧卡片切换到其他日期查看！',
                        type: 'warning',
                        duration: 6000
                    });
                    $('.events-list').hide();
                } else {
                    this.changeAbnormalList(currentDateIndex, null);
                    this.changeEventListPos($currentCard);
                    this.currentEventPage = 0;
                    this.selectedAbnormal = '';
                    if (!this.clickDateState && !this.firstLoading) {
                        this.getAbnormalList(0);
                    }
                }
            },
            ecgEndTime: function () {
                if (this.ecgEndTime.length) {
                    this.calcTimerPicker();
                }
            },
            currentDate: function () {
                this.calcTimerPicker();
            }
            // dates: function () {
            //     if (this.abnormalTypes.length === 0) {
            //         this.changeAbnormalList(0, null);
            //     }
            // }
        },
        created() {

        },
        beforeDestroy() {
            bus.$off();
            $('.ecg-day-cards').off();
        },
        mounted() {
            let reportState = JSON.parse(localStorage.getItem('scope_row'));
            if (reportState.report_state === 'FINISH' || reportState.report_state === 'AUDIT_PASS') {
                this.reportDisable = true;
            }
            this.changeGetEcgDatesLoading(true);
            bus.$off('changeUseState');
            bus.$on('changeUseState', () => {
                this.useState = false;
            });
            bus.$off('changeCurrentAbnormalList');
            bus.$on('changeCurrentAbnormalList', () => {
                if (this.abnormalTypes.length) {
                    if (!this.useState) {
                        this.getDates(() => {
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
                            this.changeCurAbnormalList(this.currentEventPage * this.limit)
                        });
                    } else {
                        this.useState = false;
                    }
                }
            });
            API.getEcgDates({
                report_id: this.report_id
            }).then(dates => {
                this.changeDates(dates);
                this.$nextTick(() => {
                    let initDateIndex = 0;
                    while ($(`.box-card:eq(${initDateIndex})`).css('display') === 'none') {
                        initDateIndex++;
                    }
                    $(`.box-card:eq(${initDateIndex})`).addClass('active');//默认选中第一个没被隐藏掉的日期卡片
                    this.changeCurrentDateIndex(initDateIndex);
                    this.changeAbnormalList(initDateIndex, null);
                    bus.$on('updateEventList', (updateRhythmData) => {
                        let selectedRowIndex = 0;
                        this.tableData = this.tableData.map((rowData, index) => {
                            if (rowData.position === updateRhythmData.position) {
                                selectedRowIndex = index;
                                return {
                                    abnormal_type: rowData.abnormal_type,
                                    datetime: rowData.datetime,
                                    length: rowData.length,
                                    checked: rowData.checked,
                                    label: updateRhythmData.label,
                                    position: rowData.position
                                };
                            } else {
                                return rowData;
                            }
                        });
                        this.$refs.eventTable.setCurrentRow(this.tableData[selectedRowIndex]);
                    });
                    setTimeout(() => {
                        this.firstLoading = false;
                    }, 0);
                });
            }).finally(() => {
                this.changeGetEcgDatesLoading(false);
            });
            let self = this;
            let currentCardIndex = -1;
            $('.ecg-day-cards').on('click', '.box-card', function () {
                if (currentCardIndex === $(this).index()) {
                    $('.events-list').toggle();
                } else {//只有点击不同日期卡片时才触发，避免反复点击同一卡片触发相同的接口和逻辑
                    self.boxCardClickDo($(this).index());
                    self.changeEventListPos($(this));
                    currentCardIndex = $(this).index();
                    self.currentEventPage = 0;
                    self.selectedAbnormal = '';
                    self.getAbnormalList(0);
                }
            });
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
        position: absolute;
        z-index: 1000;
        top: 0;
        left: 0;
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
