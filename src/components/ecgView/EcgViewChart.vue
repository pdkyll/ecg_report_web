<template>
    <div style="position: relative;width: 1150px;height: 500px">
        <div class="twinkle_dom animateTwinkle" ref="twinkleDom"></div>
        <canvas width="1150px" height="500px" id="ecg"
                style="position: absolute; top: 0; left: 0; z-index: 1999;"></canvas>
        <canvas width="1150px" height="500px" id="ecgRuler"
                style="position: absolute; top: 0; left: 0;z-index: 2000;pointer-events: none"></canvas>
        <div class="add-beat-line" :style="{left:`${addBeatLinePos.left}px`,top:`${addBeatLinePos.top}px`}"
             v-show="addBeatState">
        </div>
        <div class="add-ruler-line" :style="{left:`${addRulerLinePos.left}px`,top:`${addRulerLinePos.top}px`}"
             v-show="addRulerState">
        </div>
        <ul class="menu-ul menu"
            :style="{display:batchMenuShowState.parent?'block':'none',left:`${batchDragEndPos.x}px`,top:`${batchDragEndPos.y}px`}">
            <li><a href="javascript:void(0);" @click="takeBatchAction('batchUpdateBeats')">批量修改心博</a></li>
            <li>
                <a href="javascript:void(0);" @click="takeBatchAction('addRhythm')">添加事件</a>
            </li>
            <li><a href="javascript:void(0);" @click="takeBatchAction('addCustomRhythm')">自定义事件</a></li>
            <li><a href="javascript:void(0);" @click="takeBatchAction('reverseEcg')">翻转片段</a></li>
        </ul>
        <ul class="menu-ul child-menu"
            ref="childMenu"
            :style="{display:batchMenuShowState.child?'block':'none',left:`${batchChildMenu.x}px`,top:`${batchChildMenu.y}px`,height:`${batchChildMenu.height}px`}">
            <li v-for="item in childMenuItems">
                <a href="javascript:void(0);" @click="selectSomeActionValue(item.value)">{{item.label}}</a>
            </li>
        </ul>
        <ul class="menu-ul right-click-menu"
            :style="{display:rightClickMenuShowState?'block':'none',left:`${batchDragEndPos.x}px`,top:`${batchDragEndPos.y}px`}">
            <li><a href="javascript:void(0);" @click="setBatchBeat('start')">设为起点心博</a></li>
            <li><a href="javascript:void(0);" @click="setBatchBeat('end')">设为终点心博</a></li>
            <li><a href="javascript:void(0);" @click="takeBatchAction('batchUpdateBeats')">修改单个心博</a></li>
        </ul>
    </div>
</template>
<script>
    import {mapState, mapMutations, mapActions} from 'vuex'
    import API from '../../api/api_ecg_view';
    import axios from 'axios';
    import {EcgViewer} from '../../common/ecg_viewer';
    import {bus} from '../../bus';
    import Util from '../../common/util';
    import {RhythmMatcher} from '../../common/rhythmMatcher';

    export default {
        name: 'EcgViewChart',
        data() {
            return {
                isShowTwinkle: false, // 是否显示光标闪烁
                data: [],
                changeTagPoint: {},
                websocket: null,
                samplingFrequency: 512,//采样频率
                currentUpdateIndex: -1,//当前心拍索引
                currentRhythmIndex: -1,//当前节律索引
                viewBeatsState: false,//上下节拍导航启用状态
                viewSimilarBeatsState: false,//上下同类节拍导航启用状态
                similarBeatsType: '',//当前同类心拍的类型
                isWA: false,//判断当前按键是否为'W'或'A'
                isWS: false,//判断当前按键是否为'W'或'S'
                isPrevSimilarKey: false,//按键','
                isNextSimilarKey: false,//按键'.'
                isSlash: false,//按键'/'状态
                barColorMap: {
                    beat: 'rgba(58, 204, 22, 0.5)',
                    similarBeat: 'rgba(204, 189, 87, 0.5)',
                    rhythm: 'rgba(34, 38, 204, 0.5)'
                },
                barColor: "rgba(58, 204, 22, 0.5)",
                y_start_poses: {
                    '5': this.createYstartPoses(6),
                    '10': this.createYstartPoses(4),
                    '20': this.createYstartPoses(2),
                    '40': this.createYstartPoses(1),
                    '60': this.createYstartPoses(1)
                },
                viewRhythmState: false,//上下节律启用状态
                viewRhythmEndState: false,//是否查看节律结束位置
                scrollStartTime: 0,
                scrollEndTime: 0,//设置滚动开始结束的时间，防止滚动过快导致浏览器崩溃
                pageRows: {
                    '5': 6,
                    '10': 4,
                    '20': 2,
                    '40': 1,
                    '60': 1
                },
                pageRowsAdd: {
                    '5': 70,
                    '10': 100,
                    '20': 200,
                    '40': 450,
                    '60': 450
                },
                ecgViewer: null,
                preTagPos: 0,//用于存储异常节拍和节律的数组发生变化前的最后一个异常节拍
                preRhyPos: 0,//用于存储异常节拍和节律的数组发生变化前的最后一个异常节律的位置
                preRhyType: '',//用于存储异常节拍和节律的数组发生变化前的最后一个异常节律的类型
                abnormalNavigationId: 0,//用于处理短时间内大量相同请求，造成页面乱跳。
                abnormalNavigationLoading: false,//异常后台查询接口的加载状态
                viewBeatsTime: 0,
                currentPageTags: [],//当前页面显示的tag
                currentPageNoise: [],//当前页面的NOISE
                currentPageMaxHr: [],//当前页面的最快心率(非自定义的)
                currentPageMinHr: [],//当前页面的最慢心率(非自定义的)
                currentPageAF: [], //当前页面的房颤
                currentPageAFLUT: [], //当前页面的房扑
                changeTagRange: {
                    from: 0,
                    to: 0,
                    type: ''
                },
                fillColorMap: {//心拍类型对应颜色
                    S: '#159204',
                    V: '#d03934',
                    N: '#4650e1',
                    Q: '#838383'
                },
                addRhythmState: false,//添加异常节律的状态
                addRhythmPos: [],//存储添加节律异常的起点和终点
                eventJumpState: false,//当前是否处在异常列表跳转心电状态
                eventPos: 0,
                eventType: '',
                jumpToEcgPointIndex: 0,
                fangdouTimer: null, //防抖timer
                currentSymbolIndex: -1,
                addBeatState: false,
                addRulerState: false,
                addRulerExist: false,
                addRulerDrawWay: 'right',
                onDrawRulerState: false, //是否正在绘制ruler
                addBeatLinePos: {left: 140, top: 10},
                addRulerLinePos: {left: 140, top: 10},
                addRulerArea: {startX: 0, startY: 0, endX: 0, endY: 0, width: 0},
                addBeatTimer: null,
                //批量修改相关
                batchOperationState: false,
                batchDragEndPos: {x: 0, y: 0},
                batchChildMenu: {x: 0, y: 0, height: 145},
                batchMenuShowState: {
                    parent: false,
                    child: false
                },
                rightClickMenuShowState: false,
                currentBatchAction: {
                    type: null
                },
                rhythmTypeOptions: ['NORMAL', 'BRD', 'TAC', 'ARR', 'VC', 'CV', 'BGM', 'TGM', 'VR', 'VF',
                    'VTAC', 'VBRD', 'SC', 'CS', 'SBGM', 'STGM', 'STAC', 'SBRD', 'SVR', 'AF', 'AFLUT', 'NOISE'],
                beatTypeOptions: [
                    'N', 'V', 'S', 'Q'
                ],
                beatTypeMap: {
                    N: '正常N',
                    V: '室性V',
                    S: '房性S',
                    Q: '噪音Q'
                },
                childMenuItems: [],
                batchPos: {
                    from: 0,
                    to: 0,
                    fromBeat: 0,
                    toBeat: 0
                },
                rightClickMenuSelect: {
                    start: null,
                    end: null
                },
                batchKeyChangeBeatState: false,
            }
        },
        computed: {
            ...mapState('ecgView', {
                add: state => state.gainSelected,
                rhythmTypeSelected: state => state.rhythmTypeSelected,
                dayStartIndex: state => state.dayStartIndex,
                ecgStartTime: state => state.ecgStartTime,
                currentDate: state => state.currentDate,
                currentDateIndex: state => state.currentDateIndex,
                clickDateState: state => state.clickDateState,
                ecgDataLoading: state => state.ecgDataLoading,
                tagPos: state => state.tagPos,
                rhythm: state => state.rhythm,
                refreshState: state => state.refreshState,
                ecgFastData: state => state.ecgFastData,
                changeReset: state => state.changeReset,
                selectMain: state => state.selectMain,
                perDateData: state => state.perDateData,
                lastBlockIndex: state => state.lastBlockIndex,
                inPic: state => state.inPic,
                basicInfo: state => state.basicInfo,
                tagChangeState: state => state.tagChangeState,
                RRShowState: state => state.RRShowState,
                selectComponent: state => state.selectComponent,
                symbols: state => state.basicInfo.symbols
            }),
            ...mapState('ecgDrag', {
                heartRates: state => state.heartRates,
            }),
            report_id: function () {
                return localStorage.getItem('report_id');
            },
            viewState: function () {
                return this.viewBeatsState || this.viewRhythmState
            },
            pagePointsSum: function () {//根据增益计算每页心电的总点数,滚动翻页需要它
                return (this.samplingFrequency * 8) * (this.pageRows[this.add])
            },
            pointsRow: function () {//每行心电的总点数
                return this.samplingFrequency * 8
            },
            timeOffsetPoints: function () {//当前时间的偏移点的索引
                return this.ecgViewer === null ? 0 : this.ecgViewer.getOffset()
            },
            minutesOffset: function () {
                return Number(((this.timeOffsetPoints / (this.samplingFrequency * 60)
                    + (new Date(this.ecgStartTime).getTime() - new Date(this.ecgStartTime.split(' ')[0] + ' 00:00:00').getTime()) / 1000 / 60) % 1440).toFixed(1))
            },
            scrollCurrentDateIndex: function () {
                return Math.floor((Math.floor(this.timeOffsetPoints / (this.samplingFrequency * 60)) + Math.floor((new Date(this.ecgStartTime).getTime() - new Date(this.ecgStartTime.split(' ')[0] + ' 00:00:00').getTime()) / 1000 / 60)) / 1440)
            },
            curMin: {
                get: function () {
                    return this.$store.state.ecgDrag.curMin;
                },
                set: function () {
                }
            },
            clickDragState: {
                get: function () {
                    return this.$store.state.ecgDrag.clickDragState;
                },
                set: function () {
                }
            },
            currentHeartRate: function () {
                if (this.heartRates[this.scrollCurrentDateIndex]) {
                    return Math.round(this.heartRates[this.scrollCurrentDateIndex].data[parseInt(this.minutesOffset)]);
                } else {
                    return 0
                }
            },
            currentDateTime: function () {
                let startDate = new Date(this.ecgStartTime);
                startDate.setSeconds(startDate.getSeconds() + Math.floor(this.timeOffsetPoints / this.samplingFrequency));
                return Util.formatTimeM(startDate);
            },
            currentDateHour: function () {
                return this.currentDateTime.split(' ')[0] + ' ' + this.currentDateTime.split(' ')[1].split(':')[0] + ':00:00'
            },
            currentDateMinNum: function () {
                return new Date(this.currentDateTime).getMinutes() * 60 + new Date(this.currentDateTime).getSeconds()
            },
            downloadEcgIndex: function () {
                let ecgIndex = this.timeOffsetPoints;
                if (this.add === 10) {
                    ecgIndex = this.timeOffsetPoints - 6 * this.samplingFrequency < 0 ? 0 : this.timeOffsetPoints - 6 * this.samplingFrequency;
                } else if (this.add === 20) {
                    ecgIndex = this.timeOffsetPoints - 18 * this.samplingFrequency < 0 ? 0 : this.timeOffsetPoints - 18 * this.samplingFrequency;
                }
                return ecgIndex;
            },
            userType() {
                return JSON.parse(localStorage.getItem('access-user')).userType
            }
        },
        watch: {
            RRShowState() {
                this.init();
            },
            add: function (add) {
                this.hideTwinkle()
                this.ecgViewer.changeViewSize(this.pagePointsSum);
                this.initCanvas({
                    y_start_pos: this.y_start_poses[this.add],
                    data: this.ecgViewer.getVisibleData()
                });
            },
            changeReset: function () {
                this.init();
            },
            rhythmTypeSelected: function (rhythmTypeSelected) {
                if (this.viewRhythmState) {
//                    if (this.rhythm[this.currentRhythmIndex].state === 0) {//删除的节律不能修改
//                        this.$message.closeAll();
//                        this.$message({
//                            message: '已删除的心律不能修改',
//                            type: 'warning'
//                        });
//                        return;
//                    }
//                    if (this.rhythm[this.currentRhythmIndex].type === 'NOISE') {//噪声不能修改
//                        return;
//                    }
//                    if (rhythmTypeSelected !== '') {
//                        this.asyncUpdateTagRhythm(false,
//                            {
//                                from: this.rhythm[this.currentRhythmIndex].begin,
//                                to: this.rhythm[this.currentRhythmIndex].end
//                            },
//                            rhythmTypeSelected, (res) => {
//                                let updateRhythmData = {};
//                                updateRhythmData.position = this.rhythm[this.currentRhythmIndex].begin;
//                                updateRhythmData.label = rhythmTypeSelected;
//                                bus.$emit('updateEventList', updateRhythmData);
//                                this.updateRhythm({index: this.currentRhythmIndex, type: rhythmTypeSelected});
//                                this.initCanvas({
//                                    y_start_pos: this.y_start_poses[this.add],
//                                    data: this.ecgViewer.getVisibleData()
//                                });
//                            });
//                    }
                }
                if (this.addRhythmState) {
                    if (rhythmTypeSelected !== '') {
                        if (this.addRhythmPos.length !== 2) {//必须选择了心律的起点和终点后才能添加心律
                            return;
                        }
                        let fromPos = this.addRhythmPos[0], toPos = this.addRhythmPos[1];
                        if (fromPos > toPos) {
                            [fromPos, toPos] = [toPos, fromPos];//交换变量值
                        }
                        if (rhythmTypeSelected === 'CUSTOM') {
                            this.addCustomRhythm(rhythmTypeSelected, fromPos, toPos);
                        } else {
                            this.addRhythmFollow(rhythmTypeSelected, fromPos, toPos);
                        }
                    }
                }
            },
            //点击上方平均心率时间线
            curMin: function (curMin) {
                if (this.clickDragState) {//只有在clickDragState为true时才触发此方法，很重要！
                    let startDate = new Date(this.currentDate);
                    startDate.setSeconds(startDate.getSeconds() + curMin * 60);
                    let blockIndex = (startDate.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60;
                    if (blockIndex <= this.lastBlockIndex + 0.9) {
                        if (blockIndex < 0) {
                            this.$message.closeAll();
                            this.$message({
                                message: '超出测试的最早时间，将自动跳转至第一分钟的心电图！',
                                type: 'warning'
                            });
                            blockIndex = 0;
                            this.getMinuteEcg(blockIndex);
                            this.changeCurMin(this.minutesOffset);
                        } else {
                            this.getMinuteEcg(blockIndex);
                        }
                    } else {
                        this.$message.closeAll();
                        this.$message({
                            message: '超出测试的最后时间，将自动跳转至心电图的末尾！',
                            type: 'warning'
                        });
                        this.getMinuteEcg(this.lastBlockIndex + 0.9);
                        this.changeCurMin(this.minutesOffset);
                    }
                }
            },
            //点击左侧日期卡
            dayStartIndex: function (dayStartIndex) {
                if (this.clickDateState) {
//                    console.log(`第${this.currentDateIndex + 1}天`);
//                    console.log('今天的有效开始索引：', dayStartIndex);
                    this.changeClickDragState(false);//避免导航时候因为当前时间的变化导致跳转分钟数的函数getMinuteEcg的再次执行!
                    //当天没有有效心电数据的时候默认索引为当天凌晨
                    let blockIndex = (new Date(this.currentDate).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60;
                    if (dayStartIndex === -1) {
                        this.getMinuteEcg(blockIndex);
                    } else {
                        if (this.hasValidEcg(dayStartIndex, this.currentDateIndex + 1)) {
//                            console.log('当天有心电信号！');
                            this.getMinuteEcg(dayStartIndex);
                        } else {
//                            console.log('当天无心电信号！');
                            this.getMinuteEcg(blockIndex);
                        }
                    }
                }
            },
            //滚动跳页
            scrollCurrentDateIndex: function (currentDateIndex) {
                if (currentDateIndex > this.heartRates.length - 1) {
                    return;
                }
                let currentDate = new Date(this.ecgStartTime.split(' ')[0] + ' 00:00:00');
                currentDate.setDate(currentDate.getDate() + currentDateIndex);
                this.changeCurrentDate(this.formatTime(currentDate));
                this.changeCurrentDateIndex(currentDateIndex);
                let blockIndex = (currentDate.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60;
                this.changeClickDateState(false);
                this.changeDayStartIndex(blockIndex);//跳页后更新dayStartIndex,以便于下次点击日期卡重绘
            },
            currentDateHour: function (currentDateHour) {
                this.changeHour(currentDateHour);
                this.getHoursTagRhythm(currentDateHour);
            },
            currentDateMinNum: function (currentDateMinNum) {
                this.changeMinNum(currentDateMinNum);
            },
            selectMain: function () {
                if (this.refreshState) {
                    this.updateDayCards();
                    this.getHoursTagRhythm(this.currentDateHour);
                }
            },
            refreshState: function (refreshState) {
                if (!refreshState) {
                    this.updateDayCards();
                    this.getHoursTagRhythm(this.currentDateHour);
                }
            },
            viewRhythmState: function (viewRhythmState) {
                this.changeRhythmTypeSelectDisabled(viewRhythmState);
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeRhythmTypeSelected',
                'changeCurrentDateIndex',
                'changeDayStartIndex',
                'changeCurrentDate',
                'changeClickDateState',
                'changeEcgStartTime',
                'changeEcgEndTime',
                'changeBasicInfo',
                'changeEcgDataLoading',
                'changeTagPos',
                'updateTag',
                'deleteTag',
                'useTag',
                'changeRefreshState',
                'changeHour',
                'changeMinNum',
                'changeDeleteTagState',
                'changeDeleteTagState2',
                'changeRhythm',
                'updateRhythm',
                'deleteRhy',
                'useRhy',
                'changeUpdateTagQState',
                'changeUpdateTagQState2',
                'changeGetTagRhythmLoading',
                'changeGainSelected',
                'changeEcgChangeDirectionNext',
                'changeFastData',
                'changeTagState',
                'changePerDayData',
                'changeLastBlockIndex',
                'changeRhythmTypeSelectDisabled',
                'changeViewLoadingState'
            ]),
            ...mapActions('ecgView', [
                'changeVSTagData',
                'websocketAssignment'
            ]),
            ...mapMutations('ecgDrag', [
                'changeCurMin',
                'changeClickDragState',
                'changeHeartRates'
            ]),
            ...mapMutations('ecgDayCards', [
                'changeDates'
            ]),
            //============定义一些工具函数=============
            //计算每行心电起始时间
            calcEcgTime(index) {
                let startDate = new Date(this.ecgStartTime);
                startDate.setSeconds(startDate.getSeconds() + Math.floor(index / this.samplingFrequency));
                let hour = startDate.getHours() < 10 ? '0' + startDate.getHours() : startDate.getHours();
                let minute = startDate.getMinutes() < 10 ? '0' + startDate.getMinutes() : startDate.getMinutes();
                let second = startDate.getSeconds() < 10 ? '0' + startDate.getSeconds() : startDate.getSeconds();
                return hour + ':' + minute + ':' + second;
            },
            //将标准时间转为2018/09/05 00:00:00这种格式
            formatTime(Date) {
                let year = Date.getFullYear();
                let month = Date.getMonth() + 1 < 10 ? '0' + (Date.getMonth() + 1) : Date.getMonth() + 1;
                let date = Date.getDate() < 10 ? '0' + Date.getDate() : Date.getDate();
                let hour = Date.getHours() < 10 ? '0' + Date.getHours() : Date.getHours();
                let minute = Date.getMinutes() < 10 ? '0' + Date.getMinutes() : Date.getMinutes();
                let second = Date.getSeconds() < 10 ? '0' + Date.getSeconds() : Date.getSeconds();
                return year + '/' + month + '/' + date + ' ' + hour + ':' + minute + ':' + second;
            },
            createYstartPoses(num) {
                let arr = [];
                let start = 0;
                if (num === 1) {
                    arr.push(160);
                } else {
                    for (let i = 0; i < num; i++) {
                        arr.push(start);
                        if (num === 6) {
                            start += 70
                        } else if (num === 4) {
                            start += 100
                        } else {
                            start += 200
                        }
                    }
                }
                return arr;
            },
            //二分查找法去查找当前页对应的tag或rhythm数组的索引
            findCurrentIndex(isTag, data) {
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = parseInt((l + r) / 2);
                    let currentP = isTag ? data[mid].p : data[mid].begin;
                    if (currentP < this.timeOffsetPoints) {
                        l = mid + 1;
                    } else if (currentP > this.timeOffsetPoints) {
                        r = mid - 1;
                    } else {
                        return mid - 1;
                    }
                }
                return l - 1;
            },
            //更新心率數據
            refreshHeartRate() {
                API.getHeartRates({
                    report_id: this.report_id
                }).then(data => {
                    this.changeHeartRates(data);
                });
            },
            //更新当前tag,rhythm的index
            updateTagRhythmIndex(tagData, rhythmData) {
                //每滚动一次就会更新当前导航tag的index
                this.currentUpdateIndex = this.findCurrentIndex(true, tagData);
                //每滚动一次就会更新当前导航rhythm的index
                this.currentRhythmIndex = this.findCurrentIndex(false, rhythmData);
            },
            //当节律节拍导航发生小时级变化，导致存储异常的数组改变，需要重置index
            resetTagRhythmIndex(isTag, data, pos, type) {
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = parseInt((l + r) / 2);
                    let currentP = isTag ? data[mid].p : data[mid].begin;
                    if (currentP < pos) {
                        l = mid + 1;
                    } else if (currentP > pos) {
                        r = mid - 1;
                    } else {
                        if (isTag) {
                            return mid;
                        } else {
                            return this.findSameRhythmType(data, mid, type);
                        }
                    }
                }
                return -1;
            },
            findSameRhythmType(data, mid, type) {
                if (data[mid].type === type) {
                    return mid;
                }
                let pos = data[mid].begin;

                function find(direction) {
                    while (true) {
                        mid += direction;
                        if (mid < 0 || mid === data.length) {
                            return -1;
                        }
                        if (data[mid].type === type) {
                            return mid;
                        }
                        if (data[mid].begin !== pos) {
                            return -1;
                        }
                    }
                }

                let res = find(1);
                if (res === -1) {
                    return find(-1);
                }
                return res;
            },
            //判断第几天的是否有有效的心电数据，从1开始
            hasValidEcg(blockStartIndex, n) {
                let startDateEnd = new Date(this.ecgStartTime.split(' ')[0] + ' 23:59:00');
                if (n === 1) {
                    return blockStartIndex >= 0 && blockStartIndex <= Math.floor((startDateEnd.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60)
                } else {
                    return blockStartIndex >= ((startDateEnd.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60) + 1440 * (n - 2) + 1
                        && blockStartIndex <= ((startDateEnd.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60) + 1440 * (n - 2) + 1440
                }
            },
            rhythmTypeLabel(value) {
                return Util.rhythmTranslateMap[value] || value
            },


            //============绘图相关的函数============
            drawMediumGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_end_pos) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#ccc";
                context.beginPath();
                for (let x = x_pos; x <= x_end_pos; x += 25) {
                    context.moveTo(x + 0.5, y_start_pos + 0.5);
                    context.lineTo(x + 0.5, y_end_pos - 0.5);
                }
                for (let y = y_start_pos; y <= y_end_pos; y += 25) {
                    context.moveTo(x_pos + 0.5, y + 0.5);
                    context.lineTo(x_end_pos, y + 0.5);
                }
                context.stroke();
                context.closePath();
            },
            drawSmallGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_end_pos) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#ededed";
                context.beginPath();
                for (let x = x_pos; x <= x_end_pos; x += 5) {
                    context.moveTo(x + 0.5, y_start_pos + 0.5);
                    context.lineTo(x + 0.5, y_end_pos - 0.5);
                }
                for (let y = y_start_pos; y <= y_end_pos; y += 5) {
                    context.moveTo(x_pos + 0.5, y + 0.5);
                    context.lineTo(x_end_pos, y + 0.5);
                }
                context.stroke();
                context.closePath();
            },
            drawHr(c_canvas, averageHeart) {
                let context = c_canvas.getContext("2d");
                context.fillStyle = '#4650e1';
                context.font = "10pt Calibri";
                context.fillText(`HR: ${averageHeart} bpm`, 1060, 25);
                context.fillText(`25mm/s`, 1080, 45);
            },
            drawTags(c_canvas, x_pos, x_end_pos, y_start_pos, tagDataS, frequency) {
                this.currentPageTags = [];
                let currentIndex = this.findCurrentIndex(true, tagDataS);
                currentIndex = currentIndex === -1 ? 0 : currentIndex;
                for (let len = tagDataS.length; currentIndex < len; currentIndex++) {
                    if (tagDataS[currentIndex].p >= this.timeOffsetPoints && tagDataS[currentIndex].p < this.timeOffsetPoints + this.pagePointsSum) {
                        this.currentPageTags.push(tagDataS[currentIndex]);
                    }
                    if (tagDataS[currentIndex].p >= this.timeOffsetPoints + this.pagePointsSum) {
                        break;
                    }
                }
                if (this.currentPageTags.length === 0) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                let selectedFont = 'italic bold 10pt Calibri';//心拍类型选中对应的字体
                let unSelectedFont = '10pt Calibri';
                context.fillStyle = this.fillColorMap['N'];
                context.font = unSelectedFont;
                this.currentPageTags.map((item, index) => {
                    let rowIndex = parseInt((item.p - this.timeOffsetPoints) / frequency);
                    let xPosition = ((item.p - this.timeOffsetPoints) % frequency) / frequency * (x_end_pos - x_pos) + x_pos - 3;
                    let yPosition = y_start_pos[rowIndex] + 25;
                    if (item.state === 1) {
                        context.font = selectedFont;
                    } else {
                        context.font = unSelectedFont;
                    }
                    if (item.t === 'N') {
                        context.fillStyle = this.fillColorMap['N'];
                        context.beginPath();
                        context.arc(xPosition + 3, yPosition, 2, 0, 360, false);
                        context.fill();//画实心圆
                    } else {
                        context.fillStyle = this.fillColorMap[item.t];
                        context.fillText(item.t, xPosition, yPosition);
                    }
                    if (item.state === 0) {
                        context.beginPath();
                        if (item.t === 'N') {
                            context.moveTo(xPosition - 2, yPosition);
                            context.lineTo(xPosition + 8, yPosition);
                        } else {
                            context.moveTo(xPosition - 2, yPosition - 4);
                            context.lineTo(xPosition + 10, yPosition - 4);
                        }
                        context.stroke();
                    }
                    if (this.RRShowState) {
                        let minDistance = 35;//显示的RR间期离心电图左右边界的最小距离,避免文字重叠
                        let rrXpos = 0, rrYpos = yPosition, rr = 0, rate = 0;
                        if (index > 0) {
                            let preTagRowIndex = parseInt((this.currentPageTags[index - 1].p - this.timeOffsetPoints) / frequency);
                            let preTagXpos = ((this.currentPageTags[index - 1].p - this.timeOffsetPoints) % frequency) / frequency * (x_end_pos - x_pos) + x_pos - 3;
                            rr = parseInt((item.p - this.currentPageTags[index - 1].p) / this.samplingFrequency * 1000);
                            let rrTextWidth = context.measureText(rr).width;
                            if (rowIndex === preTagRowIndex) {
                                rrXpos = (xPosition - preTagXpos) / 2 + preTagXpos - rrTextWidth / 2 + 5;
                            } else {
                                if (x_end_pos - preTagXpos >= minDistance) {
                                    rrXpos = (x_end_pos - preTagXpos) / 2 + preTagXpos - rrTextWidth / 2 + 5;
                                    rrYpos = y_start_pos[preTagRowIndex] + 25;
                                } else {
                                    if (xPosition - x_pos >= minDistance) {
                                        rrXpos = x_pos;
                                    } else {
                                        rrXpos = x_pos - minDistance;
                                    }
                                }
                            }
                        } else {
                            let firstIndex = this.findCurrentIndex(true, tagDataS);
                            if (firstIndex !== -1) {
                                rr = parseInt((item.p - tagDataS[firstIndex].p) / this.samplingFrequency * 1000);
                            } else {
                                rr = parseInt((item.p - 0) / this.samplingFrequency * 1000);
                            }
                            if (xPosition - x_pos >= minDistance) {
                                rrXpos = x_pos;
                            } else {
                                rrXpos = x_pos - minDistance;
                            }
                        }
                        rate = parseInt(60000 / rr);
                        this.fillRRorRate(true, context, rr, rrXpos, rrYpos);
                        this.fillRRorRate(false, context, rate, rrXpos, rrYpos + 15);
                    }
                });
            },
            fillRRorRate(isRR, context, v, x, y) {
                context.fillStyle = isRR ? Util.sTag : Util.vTag;
                context.fillText(v, x, y);
            },
            //画节律异常的起始和结束的标识,函数isSamePos参数代表当前的节律异常的起始和结束标识是否在同一个点上
            drawRhythmMark(x_pos, x_end_pos, y_start_pos, frequency, y_height,
                           context, position, getType, deleteState, end, useReportState,
                           isSamePos, manual, isNavState) {
                let index = parseInt((position - this.timeOffsetPoints) / frequency);
                let tempType = getType.type;
                let type = Util.rhythmTranslateMap[tempType] || tempType;
                let italicFont = 'italic bold 10pt Calibri';//心拍类型选中对应的字体
                let normalFont = '10pt Calibri';
                let rhythmStartSymbol = manual ? '[' : '(';
                let rhythmEndSymbol = manual ? ']' : ')';
                let xPosition = ((position - this.timeOffsetPoints) % frequency) / frequency * (x_end_pos - x_pos) + x_pos;
                let yPosition = y_start_pos[index] + y_height - 45;
                if (isNavState) {
                    context.fillStyle = useReportState ? 'rgba(225,54,68,1)' : 'rgba(0,0,0,1)';
                } else {
                    context.fillStyle = useReportState ? 'rgba(225,54,68,1)' : 'rgba(0,0,0,0.5)';
                }
                if (tempType === 'CUSTOM') {
                    type = getType.title || type;
                    yPosition = y_start_pos[index] + 25;
                }
                if (tempType === 'LRR' || tempType === 'MINHR' || tempType === 'MAXHR') {
                    yPosition = y_start_pos[index] + y_height / 2;
                }
                if (tempType === 'MINHR' || tempType === 'MAXHR' || tempType === 'CUSTOM') {
                    context.font = italicFont;
                } else {
                    context.font = normalFont;
                }
                let textWidth = context.measureText(`${rhythmStartSymbol}${type}`).width;
                if (tempType === 'LRR') {
                    textWidth = context.measureText(`${type}`).width;
                }
                xPosition = xPosition - textWidth / 2;//居中心律标签
                if (xPosition + textWidth > 1140) {
                    xPosition = 1140 - textWidth;
                }
                if (!end) {
                    if (tempType === 'LRR') {
                        context.fillText(`${type}`, xPosition, yPosition - 12);
                    } else if (tempType === 'MAXHR' || tempType === 'MINHR') {
                        context.fillText(`${rhythmStartSymbol}${type}`, xPosition, yPosition - 12);
                    } else {
                        context.fillText(`${rhythmStartSymbol}${type}`, xPosition, yPosition + 12);
                    }
                } else {
                    if (isSamePos) {
                        context.fillText(`${rhythmEndSymbol}`, xPosition + textWidth, yPosition + 12);
                    } else if (tempType === 'MAXHR' || tempType === 'MINHR') {
                        context.fillText(`${type}${rhythmEndSymbol}`, xPosition, yPosition - 24);
                    } else {
                        context.fillText(`${type}${rhythmEndSymbol}`, xPosition, yPosition);
                    }
                }
                if (deleteState) {
                    let tempWidth = context.measureText(`${rhythmStartSymbol}${type}${rhythmEndSymbol}`).width;
                    if (tempType === 'LRR') {
                        tempWidth = context.measureText(`${type}`).width;
                    }
                    context.beginPath();
                    if (!end) {
                        if (tempType === 'LRR') {
                            context.moveTo(xPosition - 2, yPosition - 16);
                            context.lineTo(xPosition - 2 + tempWidth, yPosition - 16);
                        } else {
                            context.moveTo(xPosition - 2, yPosition + 8);
                            context.lineTo(xPosition - 2 + tempWidth, yPosition + 8);
                        }
                    } else {
                        if (!isSamePos) {
                            context.moveTo(xPosition - 2, yPosition - 4);
                            context.lineTo(xPosition - 2 + tempWidth, yPosition - 4);
                        }
                    }
                    context.stroke();
                    context.closePath();
                }
            },
            drawRhythm(c_canvas, x_pos, x_end_pos, y_start_pos, rhythmData, frequency, y_height) {
                this.currentPageNoise = [];
                this.currentPageAF = [];
                this.currentPageAFLUT = [];
                this.currentPageMaxHr = [];
                this.currentPageMinHr = [];
                let context = c_canvas.getContext("2d");
                context.font = "10pt Calibri";
                context.strokeStyle = '#000';
                for (let i = 0, len = rhythmData.length; i < len; i++) {
                    if (rhythmData[i].end >= this.timeOffsetPoints) {
                        if (rhythmData[i].type === 'AF') {
                            if (rhythmData[i].state !== 0) this.currentPageAF.push(rhythmData[i]);
                        }
                        if (rhythmData[i].type === 'AFLUT') {
                            if (rhythmData[i].state !== 0) this.currentPageAFLUT.push(rhythmData[i]);
                        }
                        if (rhythmData[i].type === 'NOISE' && rhythmData[i].state !== 0) {
                            this.currentPageNoise.push(rhythmData[i]);
                        }
                        if (rhythmData[i].type === 'MAXHR' && rhythmData[i].state !== 0) {
                            this.currentPageMaxHr.push(rhythmData[i]);
                        }
                        if (rhythmData[i].type === 'MINHR' && rhythmData[i].state !== 0) {
                            this.currentPageMinHr.push(rhythmData[i]);
                        }
                    }
                    if (rhythmData[i].type !== 'LRR') {
                        //开始节律标志
                        if (rhythmData[i].begin >= this.timeOffsetPoints && rhythmData[i].begin < this.timeOffsetPoints + this.pagePointsSum) {
                            this.drawRhythmMark(x_pos, x_end_pos, y_start_pos, frequency, y_height,
                                context, rhythmData[i].begin, rhythmData[i], rhythmData[i].state === 0, false,
                                rhythmData[i].state === 1, rhythmData[i].end === rhythmData[i].begin,
                                rhythmData[i].manual, i === this.currentRhythmIndex && this.viewRhythmState);
                        }
                        //结束节律标志
                        if (rhythmData[i].end >= this.timeOffsetPoints && rhythmData[i].end < this.timeOffsetPoints + this.pagePointsSum) {
                            this.drawRhythmMark(x_pos, x_end_pos, y_start_pos, frequency, y_height,
                                context, rhythmData[i].end, rhythmData[i], rhythmData[i].state === 0, true,
                                rhythmData[i].state === 1, rhythmData[i].end === rhythmData[i].begin,
                                rhythmData[i].manual, i === this.currentRhythmIndex && this.viewRhythmState);
                        }
                    } else {
                        let lrrMiddlePos = (rhythmData[i].end - rhythmData[i].begin) / 2 + rhythmData[i].begin;//算出长rr间期的时间中点位置
                        if (lrrMiddlePos >= this.timeOffsetPoints && lrrMiddlePos < this.timeOffsetPoints + this.pagePointsSum) {
                            this.drawRhythmMark(x_pos, x_end_pos, y_start_pos, frequency, y_height,
                                context, lrrMiddlePos, rhythmData[i], rhythmData[i].state === 0, false,
                                rhythmData[i].state === 1, rhythmData[i].end === rhythmData[i].begin,
                                rhythmData[i].manual, i === this.currentRhythmIndex && this.viewRhythmState);
                        }
                    }
                }
            },
            //判断当前导航指示柱是否在当前心电图内
            isBarInCurrentPageEcg(pos) {
                return pos >= this.timeOffsetPoints && pos < this.timeOffsetPoints + this.pagePointsSum;
            },
            drawSetBeatBatchBar(c_canvas, x_pos, x_end_pos, y_start_pos, tagData, frequency, barColor) {
                if (this.rightClickMenuSelect.start === null && this.rightClickMenuSelect.end === null) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                context.fillStyle = barColor;
                Object.keys(this.rightClickMenuSelect).forEach(k => {
                    if (this.rightClickMenuSelect[k] !== null && this.isBarInCurrentPageEcg(this.rightClickMenuSelect[k])) {
                        let index = parseInt((this.rightClickMenuSelect[k] - this.timeOffsetPoints) / frequency);
                        let xPosition = ((this.rightClickMenuSelect[k] - this.timeOffsetPoints) % frequency) / frequency * (x_end_pos - x_pos) + x_pos - 12.5;
                        let yPosition = y_start_pos[index] + 10;
                        context.fillRect(xPosition, yPosition, 25, 100);
                    }
                });
            },
            drawAddRhythmBar(c_canvas, x_pos, x_end_pos, y_start_pos, tagData, frequency, barColor) {
                if (this.addRhythmPos.length === 0) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                context.fillStyle = barColor;
                this.addRhythmPos.forEach(v => {
                    if (this.isBarInCurrentPageEcg(v)) {
                        let index = parseInt((v - this.timeOffsetPoints) / frequency);
                        let xPosition = ((v - this.timeOffsetPoints) % frequency) / frequency * (x_end_pos - x_pos) + x_pos - 12.5;
                        let yPosition = y_start_pos[index] + 10;
                        context.fillRect(xPosition, yPosition, 25, 100);
                    }
                });
            },
            //画节拍导航的柱子
            drawBeatsBar(c_canvas, x_pos, x_end_pos, y_start_pos, tagData, frequency, barColor) {
                if (this.currentUpdateIndex === -1 || !this.isBarInCurrentPageEcg(tagData[this.currentUpdateIndex].p)) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                context.fillStyle = barColor;
                let index = parseInt((tagData[this.currentUpdateIndex].p - this.timeOffsetPoints) / frequency);
                let xPosition = ((tagData[this.currentUpdateIndex].p - this.timeOffsetPoints) % frequency) / frequency * (x_end_pos - x_pos) + x_pos - 12.5;
                let yPosition = y_start_pos[index] + 10;
                context.fillRect(xPosition, yPosition, 25, 100);
            },
            //画节律导航的柱子
            drawRhythmBar(c_canvas, x_pos, x_end_pos, y_start_pos, rhythm, frequency, barColor, viewRhythmEndState) {
                if (this.currentRhythmIndex === -1) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                context.fillStyle = barColor;
                context.strokeStyle = barColor;
                let index = 0;
                let xPosition = 0;
                if (viewRhythmEndState) {
                    if (!this.isBarInCurrentPageEcg(rhythm[this.currentRhythmIndex].end)) {
                        return;
                    }
                    index = parseInt((rhythm[this.currentRhythmIndex].end - this.timeOffsetPoints) / frequency);
                    xPosition = (rhythm[this.currentRhythmIndex].end - this.timeOffsetPoints) % frequency / frequency * (x_end_pos - x_pos) + x_pos - 12.5;
                } else {
                    if (!this.isBarInCurrentPageEcg(rhythm[this.currentRhythmIndex].begin)) {
                        return;
                    }
                    index = parseInt((rhythm[this.currentRhythmIndex].begin - this.timeOffsetPoints) / frequency);
                    xPosition = (rhythm[this.currentRhythmIndex].begin - this.timeOffsetPoints) % frequency / frequency * (x_end_pos - x_pos) + x_pos - 12.5;
                }
                let yPosition = y_start_pos[index] + 30;
                if (rhythm[this.currentRhythmIndex].type === 'CUSTOM') {
                    context.strokeRect(xPosition, yPosition, 25, 100);
                } else {
                    context.fillRect(xPosition, yPosition, 25, 100);
                }
            },
            // 画电子分规
            drawRuler(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                if (this.addRulerArea.startX && this.addRulerArea.endX) {
                    const heightToAddMap = {
                        5: {
                            height: 60,
                            shiftPos: 40,
                            num: 6
                        },
                        10: {
                            height: 90,
                            shiftPos: 25,
                            num: 4
                        },
                        20: {
                            height: 100,
                            shiftPos: 35,
                            num: 2
                        },
                        40: {
                            height: 140,
                            shiftPos: 0,
                            num: 1
                        },
                        60: {
                            height: 200,
                            shiftPos: -20,
                            num: 1
                        }
                    };
                    y_start_pos = this.createYstartPoses(heightToAddMap[this.add].num);
                    let height = heightToAddMap[this.add].height;
                    let shiftPos = heightToAddMap[this.add].shiftPos;
                    let context = c_canvas.getContext("2d");
                    context.fillStyle = 'rgba(255,0,0,.2)';
                    let {startX, startY, endX, endY} = this.addRulerArea;
                    if (this.addRulerDrawWay === 'left') {
                        startX = this.addRulerArea.endX;
                        startY = this.addRulerArea.endY;
                        endX = this.addRulerArea.startX;
                        endY = this.addRulerArea.startY;
                    }
                    let splitIndexStart = y_start_pos.indexOf(startY - 10);
                    let splitIndexEnd = y_start_pos.indexOf(endY - 10);
                    if (splitIndexStart === -1) splitIndexStart = 0;
                    if (splitIndexEnd === -1) splitIndexEnd = heightToAddMap[this.add].num;
                    if (splitIndexStart === splitIndexEnd) {
                        context.fillRect(startX, y_start_pos[splitIndexStart] + shiftPos, endX - startX, height);
                    } else {
                        if (this.addRulerDrawWay === 'right') {
                            context.fillRect(startX, y_start_pos[splitIndexStart] + shiftPos, x_end_pos - startX, height);
                            for (let i = splitIndexStart + 1; i < splitIndexEnd; i++) {
                                context.fillRect(140, y_start_pos[i] + shiftPos, 1000, height);
                            }
                            context.fillRect(140, y_start_pos[splitIndexEnd] + shiftPos, endX - 140, height);
                        } else {
                            context.fillRect(startX, y_start_pos[splitIndexStart] + shiftPos, x_end_pos - startX, height);
                            for (let i = splitIndexStart + 1; i < splitIndexEnd; i++) {
                                context.fillRect(140, y_start_pos[i] + shiftPos, 1000, height);
                            }
                            context.fillRect(140, y_start_pos[splitIndexEnd] + shiftPos, endX - 140, height);
                        }
                    }
                    if (this.addRulerArea.width) {
                        let rrParse = Math.floor(this.addRulerArea.width * 8);
                        context.fillStyle = '#3d8cdb';
                        if (this.addRulerDrawWay === 'left') {
                            context.fillText(rrParse + 'ms', startX + 20, y_start_pos[splitIndexStart] + shiftPos + 20);
                        } else {
                            context.fillText(rrParse + 'ms', endX - 60, y_start_pos[splitIndexEnd] + shiftPos + 20);
                        }
                    }
                    context.closePath();
                }
            },
            //画心电图
            drawEcg(c_canvas, data, x_pos, x_end_pos, y_start_pos, frequency, add, y_height) {
                if (data === null) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                let length = data.length || 0;
                let normalColor = '#000000';
                let noiseColor = '#838383';
                let afColor = Util.afRythmColor;
                let aflutColor = Util.aflutRythmColor;
                let maxHrColor = Util.vTag;
                let minHrColor = Util.sTag;
                context.strokeStyle = normalColor;
                context.font = "10pt Calibri";
                context.beginPath();
                let begin = true;

                function changeEcgColor(context, color) {
                    if (context.strokeStyle !== color) {
                        context.stroke();
                        context.beginPath();
                        context.strokeStyle = color;
                    }
                }

                let rhythmMatcherNoise = new RhythmMatcher();
                rhythmMatcherNoise.setRhythms(this.currentPageNoise);
                let rhythmMatcherMaxHr = new RhythmMatcher();
                rhythmMatcherMaxHr.setRhythms(this.currentPageMaxHr);
                let rhythmMatcherMinHr = new RhythmMatcher();
                rhythmMatcherMinHr.setRhythms(this.currentPageMinHr);
                let rhythmMatcherAF = new RhythmMatcher();
                rhythmMatcherAF.setRhythms(this.currentPageAF);
                let rhythmMatcherAFLUT = new RhythmMatcher();
                rhythmMatcherAFLUT.setRhythms(this.currentPageAFLUT);
                for (let i = 0; i < length; i++) {
                    let index = parseInt(i / frequency);
                    if (index > y_start_pos.length - 1) {
                        break;
                    }
                    let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                    let yPosition = y_start_pos[index] - data[i] * add * 5 + y_height / 2;
                    if (begin) {
                        if (xPosition && yPosition) {
                            begin = false;
                            context.moveTo(xPosition, yPosition);
                        }
                    }
                    let currentPointIndex = i + this.timeOffsetPoints;

                    //心电曲线变色
                    if (rhythmMatcherNoise.find(currentPointIndex)) {
                        changeEcgColor(context, noiseColor);
                    } else if (rhythmMatcherMaxHr.find(currentPointIndex)) {
                        changeEcgColor(context, maxHrColor);
                    } else if (rhythmMatcherMinHr.find(currentPointIndex)) {
                        changeEcgColor(context, minHrColor);
                    } else if (rhythmMatcherAF.find(currentPointIndex)) {
                        changeEcgColor(context, afColor);
                    } else if (rhythmMatcherAFLUT.find(currentPointIndex)) {
                        changeEcgColor(context, aflutColor);
                    } else {
                        changeEcgColor(context, normalColor);
                    }
                    //换行画心电
                    if (i % frequency === 0) {
                        context.fillStyle = Util.afRythmColor;
                        context.fillText(`${this.calcEcgTime(i + this.timeOffsetPoints)}`
                            , xPosition - 60, y_start_pos[index] + y_height / 2);
                        context.moveTo(xPosition, y_start_pos[index] + y_height / 2);
                    } else {
                        context.lineTo(xPosition, yPosition);
                    }
                    //画手动事件
                    if (this.symbols.includes(currentPointIndex)) {
                        context.fillStyle = Util.vTag;
                        let pressWidth = context.measureText(`press`).width;
                        context.fillText(`@press`, xPosition - pressWidth / 2, y_start_pos[index] + 25);
                    }
                }
                context.stroke();
            },
            drawGrid(c_canvas, options) {//组件的核心方法,重绘整个canvas
                let {data, x_start_pos, x_end_pos, y_start_pos, y_height, tagData, frequency, add, rhythm, averageHeart} = {...options};
                this.drawSmallGrid(c_canvas, x_start_pos, x_end_pos, 10, 460);
                this.drawMediumGrid(c_canvas, x_start_pos, x_end_pos, 10, 460);
                this.drawHr(c_canvas, averageHeart);
                if (this.viewBeatsState) {
                    this.drawBeatsBar(c_canvas, x_start_pos + 100, x_end_pos, y_start_pos, tagData, frequency, this.barColor);
                }
                if (this.viewRhythmState) {
                    this.drawRhythmBar(c_canvas, x_start_pos + 100, x_end_pos, y_start_pos, rhythm, frequency, this.barColor, this.viewRhythmEndState);
                }
                if (this.addRhythmState) {
                    this.drawAddRhythmBar(c_canvas, x_start_pos + 100, x_end_pos, y_start_pos, tagData, frequency, 'rgba(208,57,52,0.5)');
                }
                if (this.rightClickMenuSelect.start !== null || this.rightClickMenuSelect.end !== null) {
                    this.drawSetBeatBatchBar(c_canvas, x_start_pos + 100, x_end_pos, y_start_pos, tagData, frequency, 'rgba(208,57,52,0.5)');
                }
                //                绘制节律标志
                this.drawRhythm(c_canvas, x_start_pos + 100, x_end_pos, y_start_pos, rhythm, frequency, y_height);
                this.drawEcg(c_canvas, data, x_start_pos + 100, x_end_pos, y_start_pos, frequency, add, y_height);
                this.drawTags(c_canvas, x_start_pos + 100, x_end_pos, y_start_pos, tagData, frequency);
            },
            initCanvas(option = {}) {
                let c_canvas = document.getElementById('ecg');
                let options = {
                    data: [],
                    frequency: this.samplingFrequency * 8,//每行心电的点数
                    tagData: this.tagPos,
                    rhythm: this.rhythm,
                    add: this.add,
                    x_start_pos: 40,
                    x_end_pos: 1140,
                    y_start_pos: this.createYstartPoses(4),
                    y_height: 150,
                    averageHeart: this.currentHeartRate
                };
                options = Object.assign(options, option);
                if (c_canvas) {
                    let context = c_canvas.getContext("2d");
                    context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                    this.drawGrid(c_canvas, options);
                }
            },
            initRuler(option = {}) {
                let c_canvas = document.getElementById('ecgRuler');
                let options = {
                    data: [],
                    frequency: this.samplingFrequency * 8,//每行心电的点数
                    tagData: this.tagPos,
                    rhythm: this.rhythm,
                    add: this.add,
                    x_start_pos: 40,
                    x_end_pos: 1140,
                    y_start_pos: this.createYstartPoses(4),
                    y_height: 150,
                    averageHeart: this.currentHeartRate
                };
                options = Object.assign(options, option);
                if (c_canvas) {
                    let context = c_canvas.getContext("2d");
                    context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                    this.drawRuler(c_canvas, options.x_start_pos + 100, options.x_end_pos, options.y_start_pos, options.y_height);
                }
            },
            init() {
                let data = null;
                this.addRulerArea = {};
                this.addRulerState = false;
                this.addRulerExist = false;
                this.onDrawRulerState = false; //是否正在绘制ruler
                this.resetMenus(true);
                if (this.ecgViewer) {
                    data = this.ecgViewer.getVisibleData();
                }
                if (data !== null) {
                    this.initCanvas({
                        y_start_pos: this.y_start_poses[this.add],
                        data: data
                    });
                    this.initRuler();
                    this.changeCurMin(this.minutesOffset);
                }
            },
            //=======心拍心律导航相关的函数=======
            //计算上下正常和异常节拍位置
            calcAbnormalBar(tagData) {
                let flag;
                let end;
                let originalPosition = this.currentUpdateIndex === -1 ? 0 : this.currentUpdateIndex;
                if (this.isWA) {
                    end = function (i) {
                        return i >= 0
                    };
                    flag = -1;
                } else {
                    end = function (i) {
                        return i < tagData.length;
                    };
                    flag = 1;
                }
                for (this.currentUpdateIndex = this.currentUpdateIndex + flag; end(this.currentUpdateIndex); this.currentUpdateIndex += flag) {
                    if (this.isWS) {
                        if (tagData[this.currentUpdateIndex].t !== 'N' && tagData[this.currentUpdateIndex].t !== 'Q') {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                if (this.currentUpdateIndex < 0) {
                    this.currentUpdateIndex = 0;
                    if (this.isWS && (tagData[this.currentUpdateIndex].t === 'N' || tagData[this.currentUpdateIndex].t === 'Q')) {
                        this.currentUpdateIndex = originalPosition;
                    }
                    if (this.isWS) {
                        this.abnormalNavigation(true, tagData[this.currentUpdateIndex], 'PreAbnormalBeat');
                    } else {
                        this.abnormalNavigation(true, tagData[this.currentUpdateIndex], 'PreBeat');
                    }
                } else if (this.currentUpdateIndex >= tagData.length) {
                    this.currentUpdateIndex = tagData.length - 1;
                    if (this.isWS && (tagData[this.currentUpdateIndex].t === 'N' || tagData[this.currentUpdateIndex].t === 'Q')) {
                        this.currentUpdateIndex = originalPosition;
                    }
                    if (this.isWS) {
                        this.abnormalNavigation(true, tagData[this.currentUpdateIndex], 'NextAbnormalBeat');
                    } else {
                        this.abnormalNavigation(true, tagData[this.currentUpdateIndex], 'NextBeat');
                    }
                } else {
                    this.calcJumpNewPage(tagData);
                }
            },
            //计算同类节拍位置
            calcSimilarBar(tagData) {
                if (!this.isPrevSimilarKey && !this.isNextSimilarKey) {
                    return;
                }
                let flag;
                let end;
                let originalPosition = this.currentUpdateIndex;
                if (this.isPrevSimilarKey) {
                    end = function (i) {
                        return i >= 0
                    };
                    flag = -1;
                } else {
                    end = function (i) {
                        return i < tagData.length;
                    };
                    flag = 1;
                }
                for (this.currentUpdateIndex = this.currentUpdateIndex + flag; end(this.currentUpdateIndex); this.currentUpdateIndex += flag) {
                    if (tagData[this.currentUpdateIndex].t === this.similarBeatsType) {
                        break;
                    }
                }
                if (this.currentUpdateIndex < 0) {
                    this.currentUpdateIndex = 0;
                    if (tagData[this.currentUpdateIndex].t !== this.similarBeatsType) {
                        this.currentUpdateIndex = originalPosition;
                    }
                    if (this.currentUpdateIndex !== -1) {
                        this.abnormalNavigation(true, tagData[this.currentUpdateIndex], 'PreSimilarBeat');
                    }
                } else if (this.currentUpdateIndex >= tagData.length) {
                    this.currentUpdateIndex = tagData.length - 1;
                    if (tagData[this.currentUpdateIndex].t !== this.similarBeatsType) {
                        this.currentUpdateIndex = originalPosition;
                    }
                    if (this.currentUpdateIndex !== -1) {
                        this.abnormalNavigation(true, tagData[this.currentUpdateIndex], 'NextSimilarBeat');
                    }
                } else {
                    this.calcJumpNewPage(tagData);
                }
                this.isPrevSimilarKey = false;
                this.isNextSimilarKey = false;
            },
            //计算上下正常,异常和同类心拍的位置
            calcBeatBar(tagData) {
                if (this.viewBeatsState) {
                    if (this.isSlash) {
                        this.isSlash = false;
                    } else {
                        if (!this.viewSimilarBeatsState) {
                            this.barColor = this.barColorMap.beat;//切为节拍导航则标识柱变回绿色
                            this.calcAbnormalBar(tagData);
                        } else {
                            this.barColor = this.barColorMap.similarBeat;
                            this.calcSimilarBar(tagData);
                        }
                    }
                }
            },
            //心拍导航跳到新页
            calcJumpNewPage(tagData) {
                if (this.currentUpdateIndex === -1) {
                    return;
                }
                this.jumpTagOrRhythmDo(tagData[this.currentUpdateIndex].p);
            },
            //心律导航跳到新页
            calcRhythmJump(rhythmData, rhythmEndState) {
                if (this.currentRhythmIndex === -1) {
                    return;
                }
                let currentRhythm = rhythmData[this.currentRhythmIndex];
                if (rhythmEndState) {
                    this.jumpTagOrRhythmDo(currentRhythm.end);
                } else {
                    this.jumpTagOrRhythmDo(currentRhythm.begin);
                }
            },
            //心拍心律导航跳页都要干的事
            jumpTagOrRhythmDo(position) {
                this.changeClickDragState(false);//避免导航时候因为当前时间的变化导致跳转分钟数的函数getMinuteEcg的再次执行!
                if ((position >= this.timeOffsetPoints + this.pagePointsSum)
                    || (position < this.timeOffsetPoints)) {
                    let offsetRow = Math.floor(position / this.pointsRow);
                    this.ecgViewer.moveTo(offsetRow * this.pointsRow);
                } else {
                    let data = this.ecgViewer.getVisibleData();
                    if (data !== null) {
                        this.initCanvas({
                            y_start_pos: this.y_start_poses[this.add],
                            data: data
                        });
                    }
                }
            },
            //用于从其他导航状态切换到节拍导航时，需要重置其他导航状态
            viewTagReset() {
                if (this.viewRhythmState || this.addRhythmState || this.addBeatState
                    || this.batchOperationState || (this.rightClickMenuSelect.start || this.rightClickMenuSelect.end)) {
                    this.reset({keyCode: 27});
                }
            },
            //用于从其他导航状态切换到节律导航时，需要重置其他导航状态
            viewRhythmReset() {
                if (this.viewBeatsState || this.addRhythmState || this.addBeatState
                    || this.batchOperationState || (this.rightClickMenuSelect.start || this.rightClickMenuSelect.end)) {
                    this.reset({keyCode: 27});
                }
            },
            //查看所有节拍
            viewBeats(event) {
                if (event.keyCode === 65) {
                    if (this.viewBeatsTime - new Date().getTime() < -100) {
                        this.viewBeatsDo(true);
                        this.viewBeatsTime = new Date().getTime();
                    }
                } else if (event.keyCode === 68) {
                    if (this.viewBeatsTime - new Date().getTime() < -100) {
                        this.viewBeatsDo(false);
                        this.viewBeatsTime = new Date().getTime();
                    }
                }
            },
            viewBeatsDo(isA) {
                if (this.tagPos.length === 0) {
                    this.$message({
                        message: '无心拍信息！',
                        type: 'warning'
                    });
                    return
                }
                this.viewTagReset();
                this.isWA = isA;
                this.isWS = false;
                this.viewBeatsState = true;
                this.viewRhythmState = false;
                this.calcBeatBar(this.tagPos);
            },
            //查看异常节拍
            viewAbnormal(event) {
                if (event.keyCode === 87) {
                    this.viewAbnormalDo(true);
                } else if (event.keyCode === 83) {
                    this.viewAbnormalDo(false);
                }
            },
            viewAbnormalDo(isW) {
                if (this.tagPos.length === 0) {
                    this.$message({
                        message: '无心拍信息！',
                        type: 'warning'
                    });
                    return
                }
                this.viewTagReset();
                this.isWA = isW;
                this.isWS = true;
                this.viewBeatsState = true;
                this.viewRhythmState = false;
                this.calcBeatBar(this.tagPos);
            },
            //查看同类节拍
            viewSimilarBeats(event) {
                if (event.keyCode === 191) {//'/'键
                    if (this.viewBeatsState) {
                        this.viewSimilarBeatsState = !this.viewSimilarBeatsState;//再次点击可取消心拍导航
                        this.similarBeatsType = this.tagPos[this.currentUpdateIndex].t;
                        if (this.viewSimilarBeatsState) {
                            this.barColor = this.barColorMap.similarBeat;
                        } else {
                            this.barColor = this.barColorMap.beat;
                        }
                        this.isSlash = true;
                        this.calcBeatBar(this.tagPos);
                        this.initCanvas({
                            y_start_pos: this.y_start_poses[this.add],
                            data: this.ecgViewer.getVisibleData()
                        });
                    }
                } else if (event.keyCode === 188) {//','键
                    if (this.tagPos.length === 0) {
                        return
                    }
                    if (!(this.viewBeatsState && this.viewSimilarBeatsState)) {
                        return
                    }
                    this.isPrevSimilarKey = true;
                    this.isNextSimilarKey = false;
                    this.calcBeatBar(this.tagPos);
                } else if (event.keyCode === 190) {//'.'键
                    if (this.tagPos.length === 0) {
                        return
                    }
                    if (!(this.viewBeatsState && this.viewSimilarBeatsState)) {
                        return
                    }
                    this.isNextSimilarKey = true;
                    this.isPrevSimilarKey = false;
                    this.calcBeatBar(this.tagPos);
                }
            },
            viewRhythm(event) {
                let noSelectRhythmType = ['S', 'V'];//导航忽略的心律类型
                if (event.keyCode === 81) {//'Q'键
                    if (this.rhythm.length === 0) {
                        this.$message({
                            message: '无异常心律信息！',
                            type: 'warning'
                        });
                        return
                    }
                    this.viewRhythmReset();
                    let originalPosition = this.currentRhythmIndex;
                    this.viewRhythmState = true;
                    for (this.currentRhythmIndex--; this.currentRhythmIndex >= 0; this.currentRhythmIndex--) {
                        if (!noSelectRhythmType.includes(this.rhythm[this.currentRhythmIndex].type)) {
                            break;
                        }
                    }
                    this.barColor = this.barColorMap.rhythm;
                    if (this.currentRhythmIndex < 0) {
                        this.currentRhythmIndex = 0;
                        if (noSelectRhythmType.includes(this.rhythm[this.currentRhythmIndex].type)) {
                            if (originalPosition !== -1) {
                                this.currentRhythmIndex = originalPosition;
                            }
                        }
                        this.abnormalNavigation(false, this.rhythm[this.currentRhythmIndex], 'PreRhythm');
                    } else {
                        this.calcRhythmJump(this.rhythm);
                    }
                    this.changeRhythmTypeSelected('');
                } else if (event.keyCode === 69) {//'E'键
                    if (this.rhythm.length === 0) {
                        this.$message({
                            message: '无异常心律信息！',
                            type: 'warning'
                        });
                        return
                    }
                    this.viewRhythmReset();
                    let originalPosition = this.currentRhythmIndex;
                    this.viewRhythmState = true;
                    for (this.currentRhythmIndex++; this.currentRhythmIndex < this.rhythm.length; this.currentRhythmIndex++) {
                        if (!noSelectRhythmType.includes(this.rhythm[this.currentRhythmIndex].type)) {
                            break;
                        }
                    }
                    this.barColor = this.barColorMap.rhythm;
                    if (this.currentRhythmIndex >= this.rhythm.length) {
                        this.currentRhythmIndex = this.rhythm.length - 1;
                        if (noSelectRhythmType.includes(this.rhythm[this.currentRhythmIndex].type)) {
                            if (originalPosition !== -1) {
                                this.currentRhythmIndex = originalPosition;
                            }
                        }
                        this.abnormalNavigation(false, this.rhythm[this.currentRhythmIndex], 'NextRhythm');
                    } else {
                        this.calcRhythmJump(this.rhythm);
                    }
                    this.changeRhythmTypeSelected('');
                } else if (event.keyCode === 82) {//'R'键
                    if (this.viewRhythmState) {
                        this.viewRhythmEndState = true;
                        this.calcRhythmJump(this.rhythm, this.viewRhythmEndState);
                        this.changeRhythmTypeSelected('');
                    }
                }
            },
            findMaxDataIndex(compareData) {
                let maxDataIndex, maxData;
                for (let i = 0; i < compareData.length; i++) {
                    if (maxData === undefined) {
                        if (compareData[i] !== undefined) {
                            maxData = compareData[i];
                            maxDataIndex = i;
                        }
                    }
                    if (maxData !== undefined && compareData[i] !== undefined) {
                        if (maxData < compareData[i]) {
                            maxData = compareData[i];
                            maxDataIndex = i;
                        }
                    }
                }
                return maxDataIndex;
            },
            addBeatFollow(pos) {
                //当前要添加的心拍位置距离已有心拍位置不能小于102，否则添加失败
                let isExistBeat = this.currentPageTags.find(beat => {
                    return Math.abs(beat.p - pos) < 102
                });
                if (isExistBeat) {
                    this.$message('当前位置已有心拍！');
                } else {
                    API.upDateTagRhythmNew(this.report_id, 'N', {from: pos, to: pos, abnormal_type: 0}).then(() => {
                        this.$message({
                            type: 'success',
                            message: '添加成功！'
                        });
                    }).finally(() => {
                        this.resetPart();
                    });
                }
            },
            quickAddBeat(event) {
                clearTimeout(this.addBeatTimer);
                this.addBeat({keyCode: 18});
                this.fastSelectTag(event);
            },
            rulerSelect(event) {
                this.addRulerArea = {};
                this.addRulerExist = false;
                this.onDrawRulerState = false; //是否正在绘制ruler
                if (this.addRulerState) {
                    this.onDrawRulerState = true;
                    this.setAddBeatLinePos(event, true);
                    return;
                }
            },
            batchDragStart(event) {
                this.batchKeyChangeBeatState = false;
                if (event.buttons === 1) {
                    this.onDrawRulerState = true;
                    this.setAddBeatLinePos(event, true);
                    this.batchMenuShowState = {
                        parent: false,
                        child: false
                    };
                    this.rightClickMenuShowState = false;
                }
            },
            //鼠标点击快速选中对应的心拍
            fastSelectTag(event) {
                if (event.buttons === 1) {
                    //点击鼠标左键，清除掉起始点设定位置
                    this.rightClickMenuSelect = {
                        start: null,
                        end: null
                    };
                }
                this.$message.closeAll();
                if (!this.addBeatState && event.ctrlKey) return;
                if (!this.addRhythmState && !this.addBeatState) {//选中单个心拍
                    this.viewBeatsState = true;
                    this.viewRhythmState = false;
                    this.viewSimilarBeatsState = false;
                    this.barColor = this.barColorMap.beat;//指示柱变为绿色
                } else if (this.addRhythmState) {
                    this.viewBeatsState = false;//当前是选择添加节律的起点与终点
                    this.viewRhythmState = false;
                    this.viewSimilarBeatsState = false;
                    this.changeRhythmTypeSelected('');
                } else if (this.addBeatState) {
                    let relativeClickPos = Math.floor(Math.floor(this.addBeatLinePos.left - 140) * (this.samplingFrequency * 8 / 1000)
                        + Math.floor((this.addBeatLinePos.top - 10) / this.pageRowsAdd[this.add]) * this.samplingFrequency * 8);
                    if (event.ctrlKey) {
                        this.addBeatFollow(relativeClickPos + this.timeOffsetPoints);
                    } else {
                        let data = this.ecgViewer.getVisibleData();
                        let leftSliceIndex = relativeClickPos - 50 < 0 ? 0 : relativeClickPos - 50;
                        let rightSliceIndex = relativeClickPos + 50 > data.length - 1 ? data.length - 1 : relativeClickPos + 50;
                        let compareData = data.slice(leftSliceIndex, rightSliceIndex);
                        let addBeatIndex = this.findMaxDataIndex(compareData);
                        if (addBeatIndex !== undefined) {
                            //判断找出的r峰上面是否已经有心拍了
                            let maxDataAbsIndex = addBeatIndex + leftSliceIndex + this.timeOffsetPoints;//当前要添加的心拍在心电图上的绝对索引
                            this.addBeatFollow(maxDataAbsIndex);
                        }
                    }
                    return;//添加心拍时不执行后续查找心拍的逻辑
                }
                this.addRulerArea = {};
                this.addRulerState = false;
                this.addRulerExist = false;
                this.initRuler();
                let {x, y} = this.getMousePos(event);
                let mouseClickPos = Math.floor(Math.floor(x - 140) * (this.samplingFrequency * 8 / 1000)
                    + Math.floor((y - 10) / this.pageRowsAdd[this.add]) * this.samplingFrequency * 8
                    + this.timeOffsetPoints);//鼠标点击位置对应于整个心电的绝对索引值
                if (this.currentPageTags.length !== 0) {
                    let minApart = Math.abs(this.currentPageTags[0].p - mouseClickPos);//记录离点击位置最近的距离，方便找出对应的tag
                    let minApartTag = this.currentPageTags[0];
                    for (let i = 1; i < this.currentPageTags.length; i++) {
                        let apart = Math.abs(this.currentPageTags[i].p - mouseClickPos);
                        if (apart < minApart) {
                            minApart = apart;
                            minApartTag = this.currentPageTags[i];
                        }
                    }
                    if (!this.addRhythmState) {
                        this.currentUpdateIndex = this.resetTagRhythmIndex(true, this.tagPos, minApartTag.p);
                        this.batchPos.from = this.tagPos[this.currentUpdateIndex].p;
                        this.batchPos.to = this.tagPos[this.currentUpdateIndex].p;
                    } else {
                        if (this.addRhythmPos.length === 1 && this.addRhythmPos[0] === minApartTag.p) {//添加事件如果是同一个心拍，则此次操作无效
                            return;
                        }
                        if (this.addRhythmPos.length === 2) {
                            this.addRhythmPos = [];
                        }
                        this.addRhythmPos.push(minApartTag.p);
                    }
                    this.initCanvas({
                        y_start_pos: this.y_start_poses[this.add],
                        data: this.ecgViewer.getVisibleData()
                    });
                } else {
                    this.$message({
                        message: '当前页面无心拍可选！',
                        type: 'warning'
                    });
                }
            },
            abnormalNavigation(isTag, tagRhy, action) {
                if (!this.abnormalNavigationLoading) {
                    this.changeClickDragState(false);//避免导航时候因为当前时间的变化导致跳转分钟数的函数getMinuteEcg的再次执行!
                    this.abnormalNavigationLoading = true;
                    this.abnormalNavigationId++;
                    axios.get('/ecg/abnormal_navigation', {
                        headers: {
                            'id': this.abnormalNavigationId
                        },
                        params: {
                            report_id: this.report_id,
                            position: isTag ? tagRhy.p : tagRhy.begin,
                            name: isTag ? tagRhy.t : tagRhy.type,
                            action: action
                        }
                    }).then((res) => {
                        if (Number(res.headers.id) === this.abnormalNavigationId) {
                            let data = res.data;
                            if (data === null) {//代表导航完了
                                this.$message.closeAll();
                                this.$message({
                                    message: '导航结束！',
                                    type: 'warning'
                                });
                                return;
                            }
                            let offsetRow = 0;
                            if (isTag) {
                                this.currentUpdateIndex = -1;
                                this.preTagPos = data.p;
                                offsetRow = Math.floor(data.p / this.pointsRow);
                            } else {
                                this.currentRhythmIndex = -1;
                                this.preRhyPos = data.begin;
                                this.preRhyType = data.type;
                                offsetRow = Math.floor(data.begin / this.pointsRow);
                            }
                            this.ecgViewer.moveTo(offsetRow * this.pointsRow);
                        }
                    }).finally(() => {
                        this.abnormalNavigationLoading = false;
                    });
                }
            },
            //查看手动事件
            viewSymbol(event) {
                if (event.keyCode === 90) {//'Z键'
                    if (this.symbols.length === 0) {
                        return;
                    }
                    if (this.currentSymbolIndex > 0) {
                        this.currentSymbolIndex--;
                        this.changeClickDragState(false);//避免导航时候因为当前时间的变化导致跳转分钟数的函数getMinuteEcg的再次执行!
                        this.ecgViewer.moveTo(Math.floor(this.symbols[this.currentSymbolIndex] / this.pointsRow) * this.pointsRow);
                    }
                } else if (event.keyCode === 88) {//'X键'
                    if (this.symbols.length === 0) {
                        return;
                    }
                    if (this.currentSymbolIndex < this.symbols.length - 1) {
                        this.currentSymbolIndex++;
                        this.changeClickDragState(false);//避免导航时候因为当前时间的变化导致跳转分钟数的函数getMinuteEcg的再次执行!
                        this.ecgViewer.moveTo(Math.floor(this.symbols[this.currentSymbolIndex] / this.pointsRow) * this.pointsRow);
                    }
                }
            },

            //=========心拍心律修改删除相关的函数==========
            //修改单个心拍
            updateBeatType(event) {
                if (this.viewBeatsState) {
                    if (this.currentUpdateIndex === -1) {
                        return;
                    }
                    let updateBeatKeyCodes = [49, 97, 50, 98, 51, 99, 52, 100];
                    if (this.tagPos[this.currentUpdateIndex].state === 0 && updateBeatKeyCodes.includes(event.keyCode)) {//如果当前标签是删除状态不能修改
                        this.$message.closeAll();
                        this.$message({
                            message: '已删除的心拍不能修改',
                            type: 'warning'
                        });
                        return;
                    }
                    switch (event.keyCode) {
                        case 49:
                        case 97:
                            if (this.tagPos[this.currentUpdateIndex].t !== 'N') {
                                this.asyncUpdateTagRhythm(true, {
                                    from: this.tagPos[this.currentUpdateIndex].p,
                                    to: this.tagPos[this.currentUpdateIndex].p
                                }, 'N', (res) => {
//                                    this.updateTag({
//                                        index: this.currentUpdateIndex,
//                                        t: 'N'
//                                    });
//                                    this.initCanvas({
//                                        y_start_pos: this.y_start_poses[this.add],
//                                        data: this.ecgViewer.getVisibleData()
//                                    });
//                                    this.changeUpdateTagQState(true);
//                                    this.changeUpdateTagQState2(true);
                                });
                            }
                            break;
                        case 50:
                        case 98:
                            if (this.tagPos[this.currentUpdateIndex].t !== 'V') {
                                this.asyncUpdateTagRhythm(true, {
                                    from: this.tagPos[this.currentUpdateIndex].p,
                                    to: this.tagPos[this.currentUpdateIndex].p
                                }, 'V', (res) => {
//                                    this.updateTag({
//                                        index: this.currentUpdateIndex,
//                                        t: 'V'
//                                    });
//                                    this.initCanvas({
//                                        y_start_pos: this.y_start_poses[this.add],
//                                        data: this.ecgViewer.getVisibleData()
//                                    });
//                                    this.changeUpdateTagQState(true);
//                                    this.changeUpdateTagQState2(true);
                                });
                            }
                            break;
                        case 51:
                        case 99:
                            if (this.tagPos[this.currentUpdateIndex].t !== 'S') {
                                this.asyncUpdateTagRhythm(true, {
                                    from: this.tagPos[this.currentUpdateIndex].p,
                                    to: this.tagPos[this.currentUpdateIndex].p
                                }, 'S', (res) => {
//                                    this.updateTag({
//                                        index: this.currentUpdateIndex,
//                                        t: 'S'
//                                    });
//                                    this.initCanvas({
//                                        y_start_pos: this.y_start_poses[this.add],
//                                        data: this.ecgViewer.getVisibleData()
//                                    });
//                                    this.changeUpdateTagQState(true);
//                                    this.changeUpdateTagQState2(true);
                                });
                            }
                            break;
                        case 52:
                        case 100:
                            if (this.tagPos[this.currentUpdateIndex].t !== 'Q') {
                                this.asyncUpdateTagRhythm(true, {
                                    from: this.tagPos[this.currentUpdateIndex].p,
                                    to: this.tagPos[this.currentUpdateIndex].p
                                }, 'Q', (res) => {
//                                    this.updateTag({
//                                        index: this.currentUpdateIndex,
//                                        t: 'Q'
//                                    });
//                                    this.initCanvas({
//                                        y_start_pos: this.y_start_poses[this.add],
//                                        data: this.ecgViewer.getVisibleData()
//                                    });
//                                    this.changeUpdateTagQState(true);
//                                    this.changeUpdateTagQState2(true);
                                });
                            }
                            break;
                    }
                }
            },
            //批量修改心拍
            batchUpdateBeatType(event) {
                if (this.batchKeyChangeBeatState) {
                    switch (event.keyCode) {
                        case 49:
                        case 97:
                            this.asyncUpdateTagRhythm(true, {
                                from: this.batchPos.from,
                                to: this.batchPos.to
                            }, 'N', (res) => {

                            });
                            this.resetMenus();
                            break;
                        case 50:
                        case 98:
                            this.asyncUpdateTagRhythm(true, {
                                from: this.batchPos.from,
                                to: this.batchPos.to
                            }, 'V', (res) => {

                            });
                            this.resetMenus();
                            break;
                        case 51:
                        case 99:
                            this.asyncUpdateTagRhythm(true, {
                                from: this.batchPos.from,
                                to: this.batchPos.to
                            }, 'S', (res) => {

                            });
                            this.resetMenus();
                            break;
                        case 52:
                        case 100:
                            this.asyncUpdateTagRhythm(true, {
                                from: this.batchPos.from,
                                to: this.batchPos.to
                            }, 'Q', (res) => {

                            });
                            this.resetMenus();
                            break;
                    }
                }
            },
            deleteBeat(event) {
                if (this.viewBeatsState) {
                    if (event.keyCode === 46) {//按'Delete'键
                        if (this.tagPos[this.currentUpdateIndex].state !== 1) {//当前事件不处于被选中为报告用图状态才能删除
                            if (this.tagPos[this.currentUpdateIndex].state === undefined) {
                                this.asyncUserSignTagRhythm(true, true, false, this.tagPos[this.currentUpdateIndex].p, this.tagPos[this.currentUpdateIndex].t, () => {
                                    this.deleteTag({deleteState: true, index: this.currentUpdateIndex, stateNum: 0});
                                    this.initCanvas({
                                        y_start_pos: this.y_start_poses[this.add],
                                        data: this.ecgViewer.getVisibleData()
                                    });
                                    this.changeDeleteTagState(true);
                                    this.changeDeleteTagState2(true);
                                });
                            } else {
                                this.asyncUserSignTagRhythm(true, true, true, this.tagPos[this.currentUpdateIndex].p, this.tagPos[this.currentUpdateIndex].t, () => {
                                    this.deleteTag({deleteState: false, index: this.currentUpdateIndex});
                                    this.initCanvas({
                                        y_start_pos: this.y_start_poses[this.add],
                                        data: this.ecgViewer.getVisibleData()
                                    });
                                    this.changeDeleteTagState(true);
                                    this.changeDeleteTagState2(true);
                                });
                            }
                        } else {
                            this.$message.closeAll();
                            this.$message({
                                message: '已选为报告用图的心拍不能删除',
                                type: 'warning'
                            });
                        }
                    }
                }
            },
            deleteRhythm(event) {
                if (this.viewRhythmState) {
                    if (event.keyCode === 46) {//按'Delete'键
                        let noDeleteRhythmType = ['LRR', 'MAXHR', 'MINHR'];//不能删除的心律类型
                        if (noDeleteRhythmType.includes(this.rhythm[this.currentRhythmIndex].type)) {
                            return;
                        }
                        if (this.rhythm[this.currentRhythmIndex].state !== 1) {//当前事件不处于被选中为报告用图状态才能删除
                            if (this.rhythm[this.currentRhythmIndex].state === undefined) {
                                this.asyncUserSignTagRhythm(false, true, false, this.rhythm[this.currentRhythmIndex].begin, this.rhythm[this.currentRhythmIndex].type, () => {
                                    this.deleteRhy({deleteState: true, index: this.currentRhythmIndex, stateNum: 0});
                                    this.initCanvas({
                                        y_start_pos: this.y_start_poses[this.add],
                                        data: this.ecgViewer.getVisibleData()
                                    });
                                });
                            } else {
                                this.asyncUserSignTagRhythm(false, true, true, this.rhythm[this.currentRhythmIndex].begin, this.rhythm[this.currentRhythmIndex].type, () => {
                                    this.deleteRhy({deleteState: false, index: this.currentRhythmIndex});
                                    this.initCanvas({
                                        y_start_pos: this.y_start_poses[this.add],
                                        data: this.ecgViewer.getVisibleData()
                                    });
                                });
                            }
                        } else {
                            this.$message.closeAll();
                            this.$message({
                                message: '已选为报告用图心律不能删除',
                                type: 'warning'
                            });
                        }
                    }
                }
            },
            addBeat(event) {
                if (event.keyCode === 18) {//'Alt键'
                    this.reset({keyCode: 27});
                    this.addBeatState = true;
                }
            },
            //获取鼠标相对于心电canvas的位置
            getMousePos(event) {
                let canvas = document.getElementById('ecg');
                let rect = canvas.getBoundingClientRect();
                let x = event.clientX - rect.left * (canvas.width / rect.width);
                let y = event.clientY - rect.top * (canvas.height / rect.height);
                return {x, y};
            },
            //心电图上的物理像素转为心电绝对索引
            mousePosToEcgAbsPos(x, y) {
                return Math.floor(Math.floor(x - 140) * (this.samplingFrequency * 8 / 1000)
                    + Math.floor((y - 10) / this.pageRowsAdd[this.add]) * this.samplingFrequency * 8
                    + this.timeOffsetPoints);//鼠标点击位置对应于整个心电的绝对索引值
            },
            setAddBeatLinePos(event, setRulerLineStart = false, setRulerLineEnd = false) {
                let {x, y} = this.getMousePos(event);
                let offsetRow = Math.floor((y - 10) / this.pageRowsAdd[this.add]);
                if (offsetRow > this.pageRows[this.add] - 1) {
                    return;
                }
                if (offsetRow === -1) offsetRow = 0;
                let addBeatLineY = offsetRow * this.pageRowsAdd[this.add] + 10;
                if (this.add === 40 || this.add === 60) {
                    addBeatLineY = 170;
                }
                if (x >= 140 && x < 1140 && y >= 10 && y <= 460) {
                    this.addBeatLinePos = {
                        left: x,
                        top: addBeatLineY
                    };
                    this.addRulerLinePos = {
                        left: x,
                        top: addBeatLineY
                    };
                    if (setRulerLineStart) {
                        this.addRulerArea = {
                            ...this.addRulerArea,
                            startX: x,
                            startY: addBeatLineY
                        }
                    }
                    if (setRulerLineEnd && this.onDrawRulerState) {
                        if (addBeatLineY < this.addRulerArea.startY) {
                            this.addRulerDrawWay = 'left';
                        } else if (addBeatLineY === this.addRulerArea.startY) {
                            if (x < this.addRulerArea.startX) {
                                this.addRulerDrawWay = 'left';
                            } else {
                                this.addRulerDrawWay = 'right';
                            }
                        } else {
                            this.addRulerDrawWay = 'right';
                        }
                        this.changeAddRulerWay(x, addBeatLineY);
                    }
                }
                if (this.addRulerExist) {
                    let restWidth = 0;
                    let changeStartX = 0;
                    let changeStartY = 0;
                    if (x <= 140) x = 140;
                    if (x >= 1140) x = 1140;
                    if (offsetRow < 0) {
                        offsetRow = 0;
                    }
                    if (this.addRulerDrawWay === 'left') {
                        if ((x + this.addRulerArea.width) <= 1140) {
                            changeStartX = x + this.addRulerArea.width;
                            changeStartY = addBeatLineY;
                        } else {
                            restWidth = x + this.addRulerArea.width - 1140;
                            let restFullLineNum = Math.floor(restWidth / 1000);
                            if (restFullLineNum === 0) {
                                changeStartX = 140 + restWidth;
                                changeStartY = (offsetRow + 1) * this.pageRowsAdd[this.add] + 10;
                            } else {
                                changeStartX = 140 + restWidth % 1000;
                                changeStartY = (offsetRow + restFullLineNum + 1) * this.pageRowsAdd[this.add] + 10;
                            }
                        }
                    } else {
                        if ((x - 140) >= this.addRulerArea.width) {
                            changeStartX = x - this.addRulerArea.width;
                            changeStartY = addBeatLineY;
                        } else {
                            restWidth = this.addRulerArea.width - (x - 140);
                            let restFullLineNum = Math.floor(restWidth / 1000);
                            if (restFullLineNum === 0) {
                                changeStartX = 1140 - restWidth;
                                changeStartY = (offsetRow - 1) * this.pageRowsAdd[this.add] + 10;
                            } else {
                                changeStartX = 1140 - restWidth % 1000;
                                changeStartY = (offsetRow - restFullLineNum - 1) * this.pageRowsAdd[this.add] + 10;
                            }
                        }
                    }
                    if (changeStartY < 0) changeStartX = 140;
                    if (changeStartY < 0) changeStartY = 10;
                    if (addBeatLineY < 0) addBeatLineY = 10;
                    this.addRulerArea = {
                        startX: changeStartX,
                        startY: changeStartY,
                        endX: x,
                        endY: addBeatLineY,
                        width: this.addRulerArea.width
                    };
                }
                this.initRuler();
            },
            changeAddRulerWay(x, y) { //改变电子分规的起始点和结束点
                this.addRulerArea = {
                    ...this.addRulerArea,
                    endX: x,
                    endY: y
                };
            },
            addRhythm(event) {
                if (event.keyCode === 187 || event.keyCode === 61 || event.keyCode === 107) {
                    this.addRhythmState = true;
                }
                if (event.keyCode === 17) {
                    this.addRulerState = false;
                }
            },
            //选为报告用图
            useReport(event) {
                if (event.keyCode === 85) {//'u键弹起时触发'
                    //心拍不能用作报告用图
//                    if (this.viewBeatsState) {
//                        if (this.tagPos[this.currentUpdateIndex].state !== 0) {//当前事件不处于删除状态才能选中为报告用图
//                            if (this.tagPos[this.currentUpdateIndex].state === undefined) {
//                                this.asyncUserSignTagRhythm(true, false, false, this.tagPos[this.currentUpdateIndex].p, this.tagPos[this.currentUpdateIndex].t, () => {
//                                    this.useTag({useState: true, index: this.currentUpdateIndex, stateNum: 1});
//                                    this.initCanvas({
//                                        y_start_pos: this.y_start_poses[this.add],
//                                        data: this.ecgViewer.getVisibleData()
//                                    });
//                                });
//                            } else {
//                                this.asyncUserSignTagRhythm(true, false, true, this.tagPos[this.currentUpdateIndex].p, this.tagPos[this.currentUpdateIndex].t, () => {
//                                    this.useTag({useState: false, index: this.currentUpdateIndex});
//                                    this.initCanvas({
//                                        y_start_pos: this.y_start_poses[this.add],
//                                        data: this.ecgViewer.getVisibleData()
//                                    });
//                                });
//                            }
//                        } else {
//                            this.$message.closeAll();
//                            this.$message({
//                                message: '已删除的心拍不能选为报告用图',
//                                type: 'warning'
//                            });
//                        }
//                    }
                    if (this.viewRhythmState) {
                        if (this.rhythm[this.currentRhythmIndex].type === 'NOISE') {//噪声不能留图
                            return;
                        }
                        if (this.rhythm[this.currentRhythmIndex].state !== 0) {//当前事件不处于删除状态才能选中为报告用图
                            if (this.rhythm[this.currentRhythmIndex].state === undefined) {
                                this.asyncUserSignTagRhythm(false, false, false, this.rhythm[this.currentRhythmIndex].begin, this.rhythm[this.currentRhythmIndex].type, () => {
                                    this.useRhy({useState: true, index: this.currentRhythmIndex, stateNum: 1});
                                    this.initCanvas({
                                        y_start_pos: this.y_start_poses[this.add],
                                        data: this.ecgViewer.getVisibleData()
                                    });
                                });
                            } else {
                                this.asyncUserSignTagRhythm(false, false, true, this.rhythm[this.currentRhythmIndex].begin, this.rhythm[this.currentRhythmIndex].type, () => {
                                    this.useRhy({useState: false, index: this.currentRhythmIndex});
                                    this.initCanvas({
                                        y_start_pos: this.y_start_poses[this.add],
                                        data: this.ecgViewer.getVisibleData()
                                    });
                                });
                            }
                        } else {
                            this.$message.closeAll();
                            this.$message({
                                message: '已删除的心律不能选为报告用图',
                                type: 'warning'
                            });
                        }
                    }
                }
            },
            //修改心拍心律的接口
            asyncUpdateTagRhythm(isTag, position, value, callback) {
                let params;
                if (isTag) {
                    params = {
                        from: position.from,
                        to: position.to,
                        abnormal_type: 0,
                        force: true
                    }
                } else {
                    params = {
                        from: position.from,
                        to: position.to,
                        abnormal_type: value === 'NOISE' ? 2 : 1,
                        force: true
                    }
                }
                API.upDateTagRhythmNew(this.report_id, value, params).then(res => {
                    this.changeTagPoint[position.from] = value;
                    callback(res);
                }).catch(() => {

                })
            },
            //选做报告用图以及删除节拍节律的接口
            asyncUserSignTagRhythm(isTag, deleteState, cancelState, position, label, callback) {
                let params = cancelState ? {
                    report_id: this.report_id,
                    abnormal_type: isTag ? 0 : 1,
                    position: position,
                    label: isTag ? undefined : label
                } : {
                    report_id: this.report_id,
                    abnormal_type: isTag ? 0 : 1,
                    position: position,
                    label: isTag ? undefined : label,
                    state: deleteState ? 0 : 1
                };
                API.userSignTagRhythm(params).then((res) => {
                    if (deleteState && !cancelState) {
                        this.changeTagPoint[position] = 'Q';
                    }
                    if (deleteState && cancelState) {
                        this.changeTagPoint[position] = label;
                    }
                    callback(res);
                })
            },
            //Esc键重置当前状态
            reset(event, part) {
                if (event.keyCode === 27) {
                    this.updateTagRhythmIndex(this.tagPos, this.rhythm);//保证再次按w,a,s,d时，心拍和心律从当前页或者离当前页最近的地方开始
                    this.viewBeatsState = false;
                    this.viewSimilarBeatsState = false;
                    this.viewRhythmState = false;
                    this.viewRhythmEndState = false;
                    this.addRhythmState = false;
                    this.addRhythmPos = [];
                    this.addBeatState = false;
                    this.addRulerArea = {};
                    this.addRulerState = false;
                    this.addRulerExist = false;
                    this.onDrawRulerState = false; //是否正在绘制ruler
                    this.batchOperationState = false;
                    this.resetMenus();
                    if (!part) {
                        this.initCanvas({
                            y_start_pos: this.y_start_poses[this.add],
                            data: this.ecgViewer.getVisibleData()
                        });
                        this.initRuler();
                    }
                }
            },
            resetPart() {
                this.reset({keyCode: 27}, true);
            },

            //=========心电图的滚动和跳转相关的函数===============
            onMouseWheel(event) {
                event.preventDefault();
                this.hideTwinkle()
                let down = true; // 定义一个标志，当滚轮向下滚时，执行一些操作
                down = event.wheelDelta ? event.wheelDelta < 0 : event.detail > 0;
                this.scrollStartTime = new Date().getTime();
//                if (this.viewState || this.addRhythmState) {
//                    this.reset({keyCode: 27});
//                }
                if (this.scrollEndTime - this.scrollStartTime < -100) {//100ms内再次滚动不会重绘图形
                    if (down) {
                        this.ecgViewer.moveTo(Math.floor(this.ecgViewer.getOffset() + this.pagePointsSum));
                        this.changeEcgChangeDirectionNext(1);
                    } else {
                        this.ecgViewer.moveTo(Math.floor(this.ecgViewer.getOffset() - this.pagePointsSum));
                        this.changeEcgChangeDirectionNext(-1);
                    }
                    if (!this.viewState) {
                        this.updateTagRhythmIndex(this.tagPos, this.rhythm);
                    }
                    this.changeClickDragState(false);//避免导航时候因为当前时间的变化导致跳转分钟数的函数getMinuteEcg的再次执行!
                }
                this.scrollEndTime = new Date().getTime();
            },
            scrollEcgRow(event) {
                if (event.keyCode === 38) {
                    this.scrollEcgRowDo(false);//按向上箭头
                    this.changeEcgChangeDirectionNext(-1);
                } else if (event.keyCode === 40) {
                    this.scrollEcgRowDo(true);//按向下箭头
                    this.changeEcgChangeDirectionNext(1);
                }
            },
            scrollEcgRowDo(isDown) {
//                if (this.viewState || this.addRhythmState) {
//                    this.reset({keyCode: 27});
//                }
                if (isDown) {
                    this.ecgViewer.moveTo(Math.floor(this.ecgViewer.getOffset() + this.pointsRow));
                } else {
                    this.ecgViewer.moveTo(Math.floor(this.ecgViewer.getOffset() - this.pointsRow));
                }
                if (!this.viewState) {
                    this.updateTagRhythmIndex(this.tagPos, this.rhythm);
                }
                this.changeClickDragState(false);//避免导航时候因为当前时间的变化导致跳转分钟数的函数getMinuteEcg的再次执行!
            },
            preventDefaultScrollRow(event) {
                if (event.keyCode === 38 || event.keyCode === 40) {
                    event.preventDefault();
                }
                if (event.keyCode === 17) {
                    event.preventDefault();
                    if (!this.addBeatState) {
                        this.addRulerState = true;
                        this.batchOperationState = false;
                    }
                }
            },
            //跳转到某时刻的心电图
            getMinuteEcg(blockIndex) {
                this.ecgViewer.moveTo(parseInt(blockIndex * 60 * 512));
                if (!this.viewState) {
                    this.updateTagRhythmIndex(this.tagPos, this.rhythm);
                }
                this.changeMinNum(this.currentDateMinNum);
            },

            //===========websocket更新相关函数==============
            //更新左侧的日期卡片统计信息
            updateDayCards() {
                API.getEcgDates({
                    report_id: this.report_id
                }).then(dates => {
                    this.changeDates(dates);
                });
            },
            //更新当前缓存的tag,以当前小时为中心前后再取一小时
            getHoursTagRhythm(currentDateHour) {
                this.changeGetTagRhythmLoading(true);
                let startTime = 0;
                let endTime = new Date(currentDateHour).setHours(new Date(currentDateHour).getHours() + 2);
                let startP, endP;
                if ((new Date(currentDateHour).getTime() - new Date(this.ecgStartTime).getTime()) < 60 * 60 * 1000) {
                    startP = 0;
                } else {
                    startTime = new Date(currentDateHour).setHours(new Date(currentDateHour).getHours() - 1);
                    startP = (startTime - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                }
                endP = (endTime - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                let requestId = this.ecgViewer.getRequestId();
                axios.get('/ecg/abnormal_list', {
                    headers: {
                        'id': requestId
                    },
                    params: {
                        report_id: this.report_id,
                        start: startP,
                        end: endP
                    }
                }).then(res => {
                    let tagRhythm = res.data;
                    if (Number(res.headers.id) === this.ecgViewer.getRequestId()) {
                        if (this.currentUpdateIndex !== -1) {
                            this.preTagPos = this.tagPos[this.currentUpdateIndex].p;
                        }
                        if (this.currentRhythmIndex !== -1) {
                            this.preRhyPos = this.rhythm[this.currentRhythmIndex].begin;
                            this.preRhyType = this.rhythm[this.currentRhythmIndex].type;
                        }
                        this.changeGetTagRhythmLoading(false);
                        this.changeTagPos(tagRhythm.tagPos);
                        this.changeRhythm(tagRhythm.rhythm);
                        this.updateTagRhythmIndex(this.tagPos, this.rhythm);
                        if (this.viewBeatsState) {
                            if (this.eventJumpState) {
                                this.currentUpdateIndex = this.resetTagRhythmIndex(true, this.tagPos, this.eventPos);
                                this.eventJumpState = false;
                            } else {
                                this.currentUpdateIndex = this.resetTagRhythmIndex(true, this.tagPos, this.preTagPos);
                                if (this.currentUpdateIndex === -1) {
                                    this.reset({keyCode: 27});
                                }
                            }
                        }
                        if (this.viewRhythmState) {
                            if (this.eventJumpState) {
                                this.currentRhythmIndex = this.resetTagRhythmIndex(false, this.rhythm, this.eventPos, this.eventType);
                                this.eventJumpState = false;
                            } else {
                                this.currentRhythmIndex = this.resetTagRhythmIndex(false, this.rhythm, this.preRhyPos, this.preRhyType);
                                if (this.currentRhythmIndex === -1) {
                                    this.reset({keyCode: 27});
                                }
                            }
                        }
                        this.init();
                    }
                });
            },
//            初始化websorcket
            initWebsocket() {
                this.websocket = new ReconnectingWebSocket(Util.wsUrl.release);
                this.websocket.onopen = this.websocketOnOpen;
                this.websocket.onmessage = this.websocketOnMessage;
                var registerHeartBeat = () => {
                    setTimeout(
                        () => {
                            if (this.websocket) {
                                this.websocketSend(JSON.stringify({
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
                this.websocketSend(JSON.stringify(obj));
            },
            websocketOnMessage(e) { //websocket获取数据
                const request = JSON.parse(e.data);
                console.log('收到信号', request);
                if (request.type === 'REPORT_DELETED' && JSON.parse(localStorage.getItem('access-user')).role !== 'ROLE_SUPER_ADMINISTRATOR' && JSON.parse(localStorage.getItem('access-user')).role !== 'ROLE_ADMINISTRATOR') {
                    bus.$emit('closeSubmitComfirm')
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
                if (request.type === 'SLICE_CHANGED') {
                    if (!this.inPic) {
                        bus.$emit('getUsePicData');
                    }
                    bus.$emit('changeCurrentAbnormalList');
                    this.refreshHeartRate();
                    this.getHoursTagRhythm(this.currentDateHour);
                    this.changeUpdateTagQState2(true);
                    bus.$emit('updateTags');
                }
                if (request.type === 'VOLTAGE_CHANGED') {
                    if (this.timeOffsetPoints >= request.from && this.timeOffsetPoints <= request.to) {
                        this.ecgViewer.updateVisibleData();
                    }
                    bus.$emit('updateVisibleEcg',request.from,request.to);
                }
                if (request.type === 'SERVER_READY') {
                    const obj = {
                        reportId: this.report_id,
                        type: 'SUBSCRIBE_REPORT'
                    };
                    this.websocketSend(JSON.stringify(obj));
                }
                if (request.type === 'BLOCK_CHANGED') {
                    bus.$emit('updateSavedAFRhythmTable')
                }
                if (request.type === 'STATISTIC_CHANGED') {
                    bus.$emit('getRecordInfo');
                    this.updateDayCards();
                }
                if (request.type === 'REPORT_COMMITTED') {
                    if (this.userType === 0) {
                        this.$router.push({path: "/doctor/patientList"});
                    }
                }
                if (request.type === 'REPORT_TAG_RANGE_CHANGE') {
                    let from = request.from || undefined;
                    let to = request.to || undefined;
                    let date = this.currentDate.split(' ')[0].replace(/\//g, '-');
                    if (request.subType === 'BEATS') {
                        // if (this.selectMain || this.selectComponent === 'afView') {
                        /**
                         * 防抖，防止多次计算
                         */
                        this.changeScatterAndLineBlockData(date)
                        // }
                    }
//                    ecgFastData
                }
            },
            _binarySearch(index, data) { //二分查找
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = Math.floor((l + r) / 2);
                    let item = data[mid];
                    let currentP = item.p;
                    if (currentP < index) {
                        l = mid + 1;
                    } else if (currentP > index) {
                        r = mid - 1;
                    } else {
                        return mid;
                    }
                }
                return l;
            },
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
            websocketSend(data) {
                this.websocket.send(data);
            },
            flatArray(arr) {
                return arr.reduce((pre, cur) => {
                    return pre.concat(cur);
                }, []);
            },
            //供内部测试人员使用，截取最近显示的一分钟心电(当前显示的是48秒的话，心电索引向前取6秒)
            downloadEcg(event) {
                if (event.ctrlKey && event.keyCode === 66) {//'ctrl+B组合键'
                    window.open(`/downloadAbnormalFragment?report_id=${this.report_id}&start_position=${this.downloadEcgIndex}`);
                }
            },
            addAllEvents() {
                //心拍心律异常的快捷键导航
                $(document).on('keydown', this.viewBeats);
                $(document).on('keyup', this.viewAbnormal);
                $(document).on('keyup', this.viewSimilarBeats);
                $(document).on('keyup', this.viewRhythm);
                $(document).on('keyup', this.reset);
                $(document).on('keyup', this.updateBeatType);
                $(document).on('keyup', this.batchUpdateBeatType);
                $(document).on('keyup', this.deleteBeat);
                $(document).on('keyup', this.deleteRhythm);
                $(document).on('keyup', this.useReport);
                $(document).on('keyup', this.viewSymbol);
                $(document).on('keyup', this.addBeat);
                bus.$emit('bindViewLongRR');
                //滚动心电图
                let ecgDom = document.getElementById('ecg');
                ecgDom.addEventListener('mousewheel', this.onMouseWheel);
                ecgDom.addEventListener('DOMMouseScroll', this.onMouseWheel);
                ecgDom.oncontextmenu = this.mouseRightClick;
                $(document).on('keyup', this.scrollEcgRow);
                $(document).on('keydown', this.preventDefaultScrollRow);
                //鼠标左键点击快速选中心拍
                let $ecg = $('#ecg');
                // 当页面有操作时 去掉光标闪烁
                $ecg.on('mousedown', () => {
                    this.hideTwinkle()
                });
                $(document).on('keydown', () => {
                    this.hideTwinkle()
                });
                $ecg.on('mousedown', this.fastSelectTag);
//                $ecg.on('dblclick', this.quickAddBeat);
                $ecg.on('mousedown', this.rulerSelect);
                $ecg.on('mousedown', this.batchDragStart);
                $ecg.on('mousemove', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.setAddBeatLinePos(e, false, true);
                    //鼠标按住拖动时
                    if (e.buttons === 1
                        && (this.viewBeatsState || this.addBeatState || this.addRhythmState)
                        && !(this.addRulerArea.endY === this.addRulerArea.startY && (Math.abs(this.addRulerArea.endX - this.addRulerArea.startX) < 3))
                    ) {
                        //清除其他鼠标点击相关事件的状态
                        this.viewBeatsState = false;
                        this.addBeatState = false;
                        this.addRhythmState = false;
                        this.addRhythmPos = [];
                        this.batchOperationState = true;
                        this.initCanvas({
                            y_start_pos: this.y_start_poses[this.add],
                            data: this.ecgViewer.getVisibleData()
                        });
                    }
                });
                $ecg.on('mouseleave', (e) => {
                    // this.addRulerExist = true;
                    if (this.onDrawRulerState) {
                        this.calcAddRulerLength();
                    }
                    this.onDrawRulerState = false;
                    return false;
                });
                $ecg.on('mouseup', (e) => {
                    e.preventDefault();
                    this.batchDragEndPos = this.getMousePos(e);
                    this.batchChildMenu.x = this.batchDragEndPos.x + 100;
                    let canvasHeight = document.getElementById('ecg').height;
                    if (this.batchDragEndPos.y > canvasHeight - 150) {
                        this.batchDragEndPos.y = canvasHeight - 150;
                    }
                    if (this.batchOperationState) {
                        this.onDrawRulerState = false;
                        //避免拖拽和选中心拍冲突
                        if (this.viewBeatsState || this.addRhythmState || this.addBeatState) {
                            return;
                        }
                        this.batchPos.from = this.mousePosToEcgAbsPos(this.addRulerArea.startX, this.addRulerArea.startY);
                        this.batchPos.to = this.mousePosToEcgAbsPos(this.addRulerArea.endX, this.addRulerArea.endY);
                        if (this.batchPos.from > this.batchPos.to) {
                            [this.batchPos.from, this.batchPos.to] = [this.batchPos.to, this.batchPos.from];
                        }
                        let fromBeatIndex = this._binarySearch(this.batchPos.from, this.currentPageTags);
                        let toBeatIndex = this._binarySearch(this.batchPos.to, this.currentPageTags) - 1;
                        if (toBeatIndex < fromBeatIndex) {
//                            this.$message({
//                                type: 'warning',
//                                message: '当前选中区域不包含心拍！'
//                            })
                        } else {
                            //赋值拖拽区间的起始心拍和终点心拍，用于添加事件
                            this.batchPos.fromBeat = this.currentPageTags[fromBeatIndex].p;
                            this.batchPos.toBeat = this.currentPageTags[toBeatIndex].p;
                            //展开菜单
                            this.batchMenuShowState = {
                                ...this.batchMenuShowState,
                                parent: true
                            };
                            this.batchKeyChangeBeatState = true;
                        }
                    } else {
                        this.addRulerExist = true;
                        this.onDrawRulerState = false;
                        this.calcAddRulerLength();
                    }
                });
                //
                $(document).on('keyup', this.downloadEcg);
                $(document).on('keyup', this.addRhythm);
            },
            calcAddRulerLength() { //计算电子分规的长度
                if (JSON.stringify(this.addRulerArea) !== '{}' && this.addRulerArea.startX !== 0 && this.addRulerArea.endX !== 0) {
                    let yStartPos = this.y_start_poses[this.add];
                    let {startX, startY, endX, endY} = this.addRulerArea;
                    if (this.addRulerDrawWay === 'left') {
                        startX = this.addRulerArea.endX;
                        startY = this.addRulerArea.endY;
                        endX = this.addRulerArea.startX;
                        endY = this.addRulerArea.startY;
                    }
                    let splitIndex = yStartPos.indexOf(endY - 10) - yStartPos.indexOf(startY - 10); //两行相差的index
                    let splitLength = 0;
                    if (splitIndex === 0) {
                        splitLength = endX - startX;
                    } else {
                        splitLength = (splitIndex - 1) * 1000 + 1000 - startX + endX; //计算总宽度
                    }
                    this.addRulerArea = {
                        ...this.addRulerArea,
                        width: splitLength
                    };
                } else {
                    this.addRulerExist = false;
                }
            },
            removeAllEvent() {
                $(document).off('keyup');
                $(document).off('keydown');
                let ecgDom = document.getElementById('ecg');
                if (ecgDom) {
                    ecgDom.removeEventListener('mousewheel', this.onMouseWheel);
                    ecgDom.removeEventListener('DOMMouseScroll', this.onMouseWheel);
                    ecgDom.removeEventListener('mousedown', this.fastSelectTag);
                    ecgDom.oncontextmenu = null;
                    $('#ecg').off();
                }
            },
            showTwinkle(isTwinkle) {
                if (isTwinkle === true) {
                    this.eventJumpState = false;
                    let options = {
                        data: [],
                        frequency: this.samplingFrequency * 8,//每行心电的点数
                        tagData: this.tagPos,
                        rhythm: this.rhythm,
                        add: this.add,
                        x_start_pos: 140,
                        x_end_pos: 1140,
                        y_start_pos: this.createYstartPoses(4),
                        y_height: 150,
                        averageHeart: this.currentHeartRate
                    };
                    let dis = parseInt((this.eventPos - this.timeOffsetPoints) % options.frequency / options.frequency * (options.x_end_pos - options.x_start_pos), 10);
                    let row = Math.floor(dis / (options.x_end_pos - options.x_start_pos))
                    let xPosition = dis % (options.x_end_pos - options.x_start_pos)
                    $(this.$refs.twinkleDom).css({
                        display: 'block',
                        left: xPosition - 5 + options.x_start_pos,
                        top: this.y_start_poses[this.add][row] + 10
                    })
                    this.isShowTwinkle = true
                    $(this.$refs.twinkleDom).addClass('twinkleActive')
                }
            },
            hideTwinkle() {
                if (this.isShowTwinkle) {
                    this.isShowTwinkle = false
                    $(this.$refs.twinkleDom).removeClass('twinkleActive')
                    $(this.$refs.twinkleDom).css({'display': 'none'})
                }
            },
            eventBeatJumpTo(isTwinkle) {
                this.barColor = this.barColorMap.beat;
                this.viewBeatsState = true;
                let currentIndex = this.resetTagRhythmIndex(true, this.tagPos, this.eventPos);
                if (currentIndex !== -1 && isTwinkle === false) {
                    this.currentUpdateIndex = currentIndex;
                    this.eventJumpState = false;
                } else {
                    this.showTwinkle(isTwinkle)
                }
            },
            manualDrawCanvas(forceReDraw = false) {
                let data = this.ecgViewer.getVisibleData();
                if (forceReDraw) {
                    setTimeout(() => {
                        this.initCanvas({
                            y_start_pos: this.y_start_poses[this.add],
                            data: this.ecgViewer.getVisibleData()
                        });
                    }, 0);
                }
                if (data !== null) {
                    this.initCanvas({
                        y_start_pos: this.y_start_poses[this.add],
                        data: this.ecgViewer.getVisibleData()
                    });
                }
            },
            addRhythmFollow(rhythmTypeSelected, fromPos, toPos, title) {
                let param1;
                if (title) {
                    param1 = {
                        from: fromPos,
                        to: toPos,
                        force: false,
                        title: title,
                        abnormal_type: 1
                    }
                } else {
                    param1 = {
                        from: fromPos,
                        to: toPos,
                        force: false,
                        abnormal_type: rhythmTypeSelected === 'NOISE' ? 2 : 1
                    }
                }
                API.upDateTagRhythmNew(this.report_id, rhythmTypeSelected, param1)
                    .then(res => {
                        this.$message({
                            message: '保存成功',
                            type: 'success'
                        });
                        this.reset({keyCode: 27});
                    }).catch((err) => {
                    //这里不用统一的错误提示
                    bus.$emit('hideErrorMessage', true);
                    if (err.response) {
                        if (err.response.data) {
                            if (err.response.data.code === 'CONFLICT') {
                                this.$confirm('该时段存在其他心律，是否要强制覆盖？', '提示', {
                                    confirmButtonText: '确定',
                                    cancelButtonText: '取消',
                                    type: 'warning'
                                }).then(() => {
                                    let param2;
                                    if (title) {
                                        param2 = {
                                            from: fromPos,
                                            to: toPos,
                                            force: true,
                                            title: title,
                                            abnormal_type: 1
                                        }
                                    } else {
                                        param2 = {
                                            from: fromPos,
                                            to: toPos,
                                            force: true,
                                            abnormal_type: rhythmTypeSelected === 'NOISE' ? 2 : 1
                                        }
                                    }
                                    API.upDateTagRhythmNew(this.report_id, rhythmTypeSelected, param2).then((res) => {
                                        this.$message({
                                            message: '保存成功',
                                            type: 'success'
                                        });
                                        this.reset({keyCode: 27});
                                    })
                                }).catch(() => {

                                }).finally(() => {

                                })
                            }
                        }
                    }
                }).finally(() => {
                    this.changeRhythmTypeSelected('');
                })
            },
            addCustomRhythm(rhythmTypeSelected, fromPos, toPos) {
                this.removeAllEvent();//避免在输出框里面输入一些字母和查看页面本身的快捷键冲突
                this.$prompt('请输入自定义留图的title', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消'
                }).then(({value}) => {
                    this.addRhythmFollow(rhythmTypeSelected, fromPos, toPos, value);
                }).catch(() => {
                    this.changeRhythmTypeSelected('');
                }).finally(() => {
                    this.addAllEvents();
                });
            },
            takeBatchAction(action) {
                switch (action) {
                    case 'batchUpdateBeats':
                        this.currentBatchAction.type = 'batchUpdateBeats';
                        this.batchChildMenu.y = this.batchDragEndPos.y;
                        this.batchChildMenu.height = 145;
                        this.childMenuItems = this.beatTypeOptions.map(v => {
                            return {
                                value: v,
                                label: this.beatTypeMap[v]
                            }
                        });
                        this.batchMenuShowState.child = true;
                        break;
                    case 'addRhythm':
                        this.currentBatchAction.type = 'addRhythm';
                        this.batchChildMenu.y = 0;
                        this.batchChildMenu.height = 500;
                        this.childMenuItems = this.rhythmTypeOptions.map(v => {
                            return {
                                value: v,
                                label: this.rhythmTypeLabel(v)
                            }
                        });
                        this.batchMenuShowState.child = true;
                        break;
                    case 'addCustomRhythm':
                        this.currentBatchAction.type = 'addCustomRhythm';
                        this.childMenuItems = [];
                        this.resetMenus();
                        this.addCustomRhythm('CUSTOM', this.batchPos.fromBeat, this.batchPos.toBeat);
                        break;
                    case 'reverseEcg':
                        this.currentBatchAction.type = 'reverseEcg';
                        this.childMenuItems = [];
                        bus.$emit('reverseBlock', this.batchPos.from, this.batchPos.to, true);
                        this.resetMenus();
                        break;
                }
            },
            selectSomeActionValue(value) {
                switch (this.currentBatchAction.type) {
                    case 'batchUpdateBeats':
                        this.asyncUpdateTagRhythm(true, {
                            from: this.batchPos.from,
                            to: this.batchPos.to
                        }, value, (res) => {

                        });
                        this.resetMenus();
                        break;
                    case 'addRhythm':
                        this.addRhythmFollow(value, this.batchPos.fromBeat, this.batchPos.toBeat);
                        this.resetMenus();
                        break;
                }
            },
            mouseRightClick() {
                if (this.rightClickMenuSelect.start !== null && this.rightClickMenuSelect.end !== null) {
                    //清除掉右键起始点设定
                    this.rightClickMenuSelect = {
                        start: null,
                        end: null
                    };
                    this.initCanvas({
                        y_start_pos: this.y_start_poses[this.add],
                        data: this.ecgViewer.getVisibleData()
                    });
                }
                this.batchMenuShowState = {parent: false, child: false};
                this.batchKeyChangeBeatState = false;
                this.rightClickMenuShowState = true;
                return false;
            },
            setBatchBeat(startOrEnd) {
                if (startOrEnd === 'start') {
                    if (this.rightClickMenuSelect.end !== null && this.rightClickMenuSelect.end !== this.batchPos.from) {
                        this.rightClickMenuSelect.start = this.batchPos.from;
                        this.setBatchBeatFollow();
                    } else {
                        //只要不满足条件，就重置之前的操作
                        this.rightClickMenuSelect.end = null;
                        this.rightClickMenuSelect.start = this.batchPos.from;
                    }
                } else {
                    if (this.rightClickMenuSelect.start !== null && this.rightClickMenuSelect.start !== this.batchPos.from) {
                        this.rightClickMenuSelect.end = this.batchPos.from;
                        this.setBatchBeatFollow();
                    } else {
                        //只要不满足条件，就重置之前的操作
                        this.rightClickMenuSelect.start = null;
                        this.rightClickMenuSelect.end = this.batchPos.from;
                    }
                }
                this.rightClickMenuShowState = false;
                this.viewBeatsState = false;
                this.initCanvas({
                    y_start_pos: this.y_start_poses[this.add],
                    data: this.ecgViewer.getVisibleData()
                });
            },
            setBatchBeatFollow() {
                this.batchMenuShowState = {
                    ...this.batchMenuShowState,
                    parent: true
                };
                if (this.rightClickMenuSelect.start > this.rightClickMenuSelect.end) {
                    [this.rightClickMenuSelect.start, this.rightClickMenuSelect.end] = [this.rightClickMenuSelect.end, this.rightClickMenuSelect.start];
                }
                this.batchPos = {
                    from: this.rightClickMenuSelect.start,
                    to: this.rightClickMenuSelect.end,
                    fromBeat: this.rightClickMenuSelect.start,
                    toBeat: this.rightClickMenuSelect.end
                };
                this.batchKeyChangeBeatState = true;
            },
            resetMenus(resetPart) {
                this.batchMenuShowState = {parent: false, child: false};
                this.rightClickMenuShowState = false;
                if (!resetPart) {
                    this.rightClickMenuSelect = {
                        start: null,
                        end: null
                    };
                }
                this.batchKeyChangeBeatState = false;
            }
        },
        beforeCreate() {

        },
        created() {
        },
        beforeDestroy() {
            let ws = this.websocket;
            if (ws) {
                this.websocket = null;
                ws.close();
            }
            bus.$off();
        },
        mounted() {
            this.initWebsocket();
            this.changeEcgDataLoading(true);
            axios.all([API.getLastBlockIndex({
                report_id: this.report_id
            }), API.getDayStartEcg({
                report_id: this.report_id,
                block_index: 0
            }), API.getBasicInfo({
                report_id: this.report_id
            }), API.getHeartRates({
                report_id: this.report_id
            })])
                .then(axios.spread((lastBlockIndex, dayStartIndex, basicInfo, heartRates) => {
                    this.removeAllEvent();
                    this.addAllEvents();
                    this.changeBasicInfo(basicInfo);
                    this.changeHeartRates(heartRates);
                    this.changeEcgStartTime(basicInfo.recordTime);
                    this.changeEcgEndTime(basicInfo.recordEndTime);
                    let tempCurrentDate = new Date(basicInfo.recordTime);
                    tempCurrentDate.setMinutes(tempCurrentDate.getMinutes() + dayStartIndex);
                    this.changeCurrentDate(Util.formatTimeM(tempCurrentDate).split(' ')[0] + ' 00:00:00');
                    this.changeLastBlockIndex(lastBlockIndex);
                    this.ecgViewer = new EcgViewer(
                        this.report_id, // reportId
                        this.samplingFrequency * 60, // 块大小
                        lastBlockIndex + 1, // 块数量
                        this.pagePointsSum, // 显示数据量
                        Math.floor(2 * this.pagePointsSum), // 向前预加载显示数据的2倍
                        Math.floor(2 * this.pagePointsSum), // 向后预加载显示数据的2倍,
                        () => {
                            this.init();
                        }
                    );
                    this.ecgViewer.moveTo(dayStartIndex * 512 * 60);
                    // changeRangePoint
                    /**
                     * 触发实时更新tag
                     */
                    bus.$off('updateCurTags');
                    bus.$on('updateCurTags', () => {
                        this.getHoursTagRhythm(this.currentDateHour);
                    });
                    // isTwinkle 跳转过来是心拍选中，不是心拍闪烁 true代表闪烁
                    bus.$on('getPosEcg', (param, state = true, isTwinkle = false) => {
                        bus.$emit('jumpToMain', () => {
                            this.resetPart();
                            this.changeClickDragState(false);//避免导航时候因为当前时间的变化导致跳转分钟数的函数getMinuteEcg的再次执行!
                            if (!state) {
                                this.eventPos = param;
                                this.eventJumpState = true;
                                this.eventBeatJumpTo(isTwinkle);
                                this.manualDrawCanvas(true);
                            }
                            this.ecgViewer.moveTo(this.pointsRow * (Math.floor(param / this.pointsRow)));
                        });
                    });
                    bus.$on('getEventEcg', (row) => {
                        let noSelectRhythmType = [];
                        this.resetPart();
                        this.changeClickDragState(false);//避免导航时候因为当前时间的变化导致跳转分钟数的函数getMinuteEcg的再次执行!
                        this.eventPos = row.position;
                        this.eventType = row.title || row.label;
                        if (!noSelectRhythmType.includes(row.label)) {
                            this.eventJumpState = true;
                        }
                        this.changeRhythmTypeSelected('');
                        if (!noSelectRhythmType.includes(row.label)) {
                            this.barColor = this.barColorMap.rhythm;
                            this.viewRhythmState = true;
                            let currentIndex = this.resetTagRhythmIndex(false, this.rhythm, this.eventPos, this.eventType);
                            if (currentIndex !== -1) {
                                this.currentRhythmIndex = currentIndex;
                                this.eventJumpState = false;
                            }
                        }
                        // }
                        this.manualDrawCanvas();
                        if (this.calcEcgTime(this.timeOffsetPoints) === '00:00:00') {
                            this.ecgViewer.moveTo(row.position);
                        } else {
                            this.ecgViewer.moveTo(this.pointsRow * (Math.floor(row.position / this.pointsRow)));
                        }
                    });
                })).finally(() => {
                this.changeEcgDataLoading(false);
            });
        },
        destroyed() {
            this.ecgViewer = null;
//            this.changeEcgStartTime('');
//            this.changeHour('');
        },
        //父级动态组件激活触发
        activated() {
            this.removeAllEvent();
            this.addAllEvents();
            //重新进入心电报告主页，刷新心电图显示区域
            this.init();
        },
        //父级动态组件失效触发
        deactivated() {
            this.hideTwinkle()
            this.removeAllEvent();
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    .add-beat-line {
        position: absolute;
        width: 1px;
        height: 120px;
        background-color: #fe010f;
        pointer-events: none;
        z-index: 2001;
    }

    @keyframes twinkle {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    @-moz-keyframes twinkle {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    @-webkit-keyframes twinkle {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    @-o-keyframes twinkle {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    .twinkleActive {
        animation: twinkle 2s infinite;
        -moz-animation: twinkle 2s infinite;
        -webkit-animation: twinkle 2s infinite;
        -o-animation: twinkle 2s infinite;
    }

    .twinkle_dom {
        position: absolute;
        top: 0;
        left: 0;
        display: none;
        height: 130px;
        width: 10px;
        background: #f55757;
    }

    .add-ruler-line {
        position: absolute;
        width: 1px;
        height: 120px;
        background-color: #feb82c;
        pointer-events: none;
    }

    .menu-ul {
        width: 100px;
        border: 1px solid #ccc;
        position: absolute;
        box-shadow: 0 0 5px rgba(0, 0, 0, .2);
        transition: all .1s ease;
        z-index: 2001;
        background-color: #fff;
        font-size: 14px;
    }

    .menu-ul li {
        list-style: none;
        width: 100%;
    }

    .menu-ul li a {
        display: inline-block;
        text-decoration: none;
        color: #555;
        width: 100%;
        padding: 5px 0;
        text-align: center;
    }

    .menu-ul li a:hover {
        color: #3b96c5;
    }

    .child-menu {
        overflow: auto;
    }
</style>
