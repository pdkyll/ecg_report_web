<template>
    <div ref="fewSecondsEcgRoot" style="position: relative">
        <div v-if="isEcgMain" class="twinkle_dom animateTwinkle" ref="twinkleDom"
             :class="{'twinkleActive': isTwinkle}"></div>
        <div style="position:relative;margin-top: 10px" ref="selfCanvasWidth"
             :style="{width:canvasWidth+'px',height:canvasHeight+'px'}"
             v-loading="ecgLoading">
            <canvas ref="interactionCanvas" :width="canvasWidth" :height="canvasHeight"
                    style="z-index: 300;" class="canvas"></canvas>
            <canvas ref="ecgCanvas" :width="canvasWidth" :height="canvasHeight"
                    style="z-index: 200;" class="canvas"></canvas>
            <canvas ref="backgroundCanvas" :width="canvasWidth" :height="canvasHeight"
                    style="z-index: 100;" class="canvas"></canvas>
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
                <li><a href="javascript:void(0);" @click="takeBatchAction('batchDeleteBeat')">删除心博</a></li>
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
                <li><a href="javascript:void(0);" @click="takeBatchAction('batchDeleteBeat')">删除心博</a></li>
            </ul>
        </div>
    </div>
</template>
<script>
    import {EcgViewer} from '../../common/ecg_viewer';
    import {mapState, mapMutations} from 'vuex';
    import axios from 'axios'
    import Util from '../../common/util';
    import {bus} from '../../bus';
    import {RhythmMatcher} from '../../common/rhythmMatcher';
    import API from '../../api/api_ecg_view';

    export default {
        name: 'FewSecondsEcg',
        props: {
            isTwinkle: { // 表示当前位置是一个跳转的位置
                type: Boolean,
                default: false
            },
            ecgPosition: {
                type: Number,
                default: -1
            },
            add: {
                type: Number,
                default: 10
            },
            RRShowState: {
                type: Boolean,
                default: false
            },
            isEcgMain: {
                type: Boolean,
                default: false
            },
            rhythmTypeSelected: {
                type: String,
                default: ''
            },
            jumpToRhythm: {
                type: Object,
                default: null
            },
            isClearState: {
                type: Boolean,
                default: false
            }
        },
        data() {
            return {
                showPosition: -512,
                canvasWidth: this.isEcgMain ? 1150 : 1550,
                canvasHeight: this.isEcgMain ? 500 : 160,
                grid: {//实际画心电图的位置离canvas左右的间距
                    left: this.isEcgMain ? 140 : 150,
                    right: this.isEcgMain ? 10 : 150,
                    top: 10,
                    bottom: this.isEcgMain ? 40 : 0
                },
                ecgViewer: null,
                ecgData: [],
                highLightBlock: {
                    start: 757,
                    end: 789
                },
                fillColorMap: {//心拍类型对应颜色
                    S: '#159204',
                    V: '#d03934',
                    N: '#4650e1',
                    Q: '#838383'
                },
                ecgLoading: false,
                //心电数据显示相关
                ecgOptions: {
                    samplingFrequency: 512,//心电图的采样频率
                    ecgRowSeconds: this.isEcgMain ? 8 : 10,//心电图一行有几秒心电
                    yStartPoses: {
                        '5': this.createYstartPoses(6),
                        '10': this.createYstartPoses(this.isEcgMain ? 4 : 1),
                        '20': this.createYstartPoses(2),
                        '40': this.createYstartPoses(1),
                        '60': this.createYstartPoses(1)
                    },
                    pageRows: {
                        '5': 6,
                        '10': this.isEcgMain ? 4 : 1,
                        '20': 2,
                        '40': 1,
                        '60': 1
                    },
                    pageRowsAdd: {
                        '5': 70,
                        '10': this.isEcgMain ? 100 : 150,
                        '20': 200,
                        '40': 450,
                        '60': 450
                    },
                },
                currentUpdateIndex: -1,//当前心拍索引
                currentRhythmIndex: -1,//当前节律索引
                tagPos: [],
                rhythm: [],
                preTagPos: 0,//用于存储异常节拍和节律的数组发生变化前的最后一个异常节拍
                preRhyPos: 0,//用于存储异常节拍和节律的数组发生变化前的最后一个异常节律的位置
                preRhyType: '',//用于存储异常节拍和节律的数组发生变化前的最后一个异常节律的类型
                currentPageTags: [],//当前页面显示的tag
                currentPageNoise: [],//当前页面的NOISE
                currentPageMaxHr: [],//当前页面的最快心率(非自定义的)
                currentPageMinHr: [],//当前页面的最慢心率(非自定义的)
                currentPageAF: [], //当前页面的房颤
                currentPageAFLUT: [], //当前页面的房扑
                //心拍心律导航，心电图滚动
                scrollStartTime: 0,
                scrollEndTime: 0,//设置滚动开始结束的时间，防止滚动过快导致浏览器崩溃
                viewBeatsTime: 0,
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
                barHeight: 100,//节拍节律选中的指示柱高度
                abnormalNavigationId: 0,//用于处理短时间内大量相同请求，造成页面乱跳。
                abnormalNavigationLoading: false,//异常后台查询接口的加载状态
                eventJumpState: false,//跳转至某个心拍
                //导航心律
                viewRhythmState: false,
                viewRhythmEndState: false,

                changeTagPoint: {},
                currentSymbolIndex: -1,//当前手动事件的索引
                //添加心拍
                addBeatState: false,
                addBeatLinePos: {left: 150, top: 10},
                //添加心律
                addRhythmState: false,//添加异常节律的状态
                addRhythmPos: [],//存储添加节律异常的起点和终点
                //电子标尺
                addRulerState: false,
                addRulerExist: false,
                addRulerDrawWay: 'right',
                onDrawRulerState: false, //是否正在绘制ruler
                addRulerLinePos: {left: 150, top: 10},
                addRulerArea: {startX: 0, startY: 0, endX: 0, endY: 0, width: 0},
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
                cacheRhythm: null
            }
        },
        computed: {
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                lastBlockIndex: state => state.lastBlockIndex,
                symbols: state => state.basicInfo.symbols,
                ecgDataLoading: state => state.ecgDataLoading,
                selectComponent: state => state.selectComponent,
                dateIndex: state => state.dateIndex,
                currentDate: state => state.currentDate
            }),
            ...mapState('ecgDrag', {
                heartRates: state => state.heartRates,
            }),
            canvasOptions: function () {
                return {
                    data: this.ecgData,
                    frequency: this.ecgOptions.samplingFrequency * this.ecgOptions.ecgRowSeconds,
                    x_start_pos: this.grid.left,
                    x_end_pos: this.canvasWidth - this.grid.right,
                    y_start_pos: this.ecgOptions.yStartPoses[this.add],
                    y_height: 150,
                    add: this.add,
                    tagData: this.tagPos,
                    rhythm: this.rhythm
                }
            },
            timeOffsetPoints: function () {//当前时间的偏移点的索引
                return this.ecgViewer === null ? 0 : this.ecgViewer.getOffset()
            },
            currentDateTime: function () {
                let startDate = new Date(this.ecgStartTime);
                startDate.setSeconds(startDate.getSeconds() + Math.floor(this.timeOffsetPoints / this.ecgOptions.samplingFrequency));
                return Util.formatTimeM(startDate);
            },
            currentDateHour: function () {
                return this.currentDateTime.split(' ')[0] + ' ' + this.currentDateTime.split(' ')[1].split(':')[0] + ':00:00'
            },
            report_id: function () {
                return localStorage.getItem('report_id');
            },
            pagePointsSum: function () {//根据增益计算每页心电的总点数,滚动翻页需要它
                let {samplingFrequency, ecgRowSeconds, pageRows} = this.ecgOptions;
                return samplingFrequency * ecgRowSeconds * pageRows[this.add]
            },
            pointsRow: function () {//每行心电的总点数
                let {samplingFrequency, ecgRowSeconds} = this.ecgOptions;
                return samplingFrequency * ecgRowSeconds
            },
            viewState: function () {
                return this.viewBeatsState || this.viewRhythmState
            },
            minutesOffset: function () {
                return Math.floor((this.timeOffsetPoints / (this.ecgOptions.samplingFrequency * 60)
                    + (new Date(this.ecgStartTime).getTime() - new Date(this.ecgStartTime.split(' ')[0] + ' 00:00:00').getTime()) / 1000 / 60) % 1440)
            },
            downloadEcgIndex: function () {
                let startPos = this.timeOffsetPoints - ((60 * this.ecgOptions.samplingFrequency - this.pagePointsSum) / 2);
                return startPos < 0 ? 0 : startPos;
            },
        },
        watch: {
            timeOffsetPoints(val) {
                this.$emit('ecgChange', val);
            },
            ecgPosition: function () {
                this.showPosition = this.ecgPosition;
            },
            showPosition() {
                let moveToPosition = this.showPosition;
                if (this.ecgViewer) {
                    this.ecgViewer.moveTo(moveToPosition);
                    if (!this.viewState) {
                        this.updateTagRhythmIndex(this.tagPos, this.rhythm);
                    }
                    if (this.isTwinkle) {
                        this.showTwinkle(this.isTwinkle);
                    }
                }
            },
            currentDateHour: function (currentDateHour) {
                if (this.ecgViewer) {
                    this.getHoursTagRhythm(currentDateHour);
                }
            },
            rhythmTypeSelected: function (rhythmTypeSelected) {
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
            ecgDataLoading(ecgDataLoading) {
                if (!ecgDataLoading) {
                    this.initEcgViewer();
                    this.getTagsReq(this.currentDateHour, (res) => {
                        this.tagPos = res.data.tagPos;
                        this.rhythm = res.data.rhythm;
                        this.$emit('tagsChange', {tagPos: this.tagPos, rhythm: this.rhythm});
                        this.initInteractionCanvas();
                    });
                    this.ecgViewer.moveTo(this.showPosition);
                }
            },
            RRShowState(RRShowState) {
                this.initInteractionCanvas();
            },
            add(add) {
                this.ecgViewer.changeViewSize(this.pagePointsSum);
                this.init();
            },
            viewRhythmState: function (viewRhythmState) {
                this.$emit('disableRhythmTypeSelect', viewRhythmState)
            },
        },
        beforeDestroy() {
            bus.$off();
        },
        deactivated() {
            this.removeAllEvent();
            this.hideTwinkle();
        },
        activated() {
            this.addAllEvents();
        },
        mounted() {
            this.drawBackgroundGrid();
            if (this.ecgStartTime !== '') {
                this.initEcgViewer();
                this.getTagsReq(this.currentDateHour, (res) => {
                    this.tagPos = res.data.tagPos;
                    this.rhythm = res.data.rhythm;
                    this.$emit('tagsChange', {tagPos: this.tagPos, rhythm: this.rhythm});
                    this.initInteractionCanvas();
                });
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeSelectComponent'
            ]),
            // 跳转原图返回当前页是否有选中心拍以及返回心拍的position 供外部调用
            returnBeat() {
                if (this.currentUpdateIndex === -1 || !this.isBarInCurrentPageEcg(this.tagPos[this.currentUpdateIndex].p)) {
                    return {position: this.timeOffsetPoints, statu: false}
                } else {
                    return {position: this.tagPos[this.currentUpdateIndex].p, statu: true}
                }
            },
            showTwinkle(isTwinkle) {
                let options = this.canvasOptions
                let dis = parseInt((this.ecgPosition - this.timeOffsetPoints) % options.frequency / options.frequency * (options.x_end_pos - options.x_start_pos), 10);
                let row = Math.floor(dis / (options.x_end_pos - options.x_start_pos))
                let xPosition = dis % (options.x_end_pos - options.x_start_pos)
                $(this.$refs.twinkleDom).css({
                    left: xPosition - 5 + options.x_start_pos,
                    top: options.y_start_pos[row] + 10
                })
            },
            flatArray(arr) {
                return arr.reduce((pre, cur) => {
                    return pre.concat(cur);
                }, []);
            },
            initEcgViewer() {
                if (this.ecgViewer === null) {
                    this.ecgViewer = new EcgViewer(
                        this.report_id, // reportId
                        this.ecgOptions.samplingFrequency * 60, // 块大小
                        this.lastBlockIndex + 1, // 块数量
                        this.pagePointsSum, // 显示数据量
                        Math.floor(2 * this.pagePointsSum), // 向前预加载显示数据的2倍
                        Math.floor(2 * this.pagePointsSum), // 向后预加载显示数据的2倍,
                        () => {
                            this.ecgData = this.ecgViewer.getVisibleData();
                            if (this.ecgData) {
                                this.init();
                            }
                        }
                    );
                }
            },
            //计算每行心电起始时间
            calcEcgTime(index) {
                let startDate = new Date(this.ecgStartTime);
                startDate.setSeconds(startDate.getSeconds() + Math.floor(index / this.ecgOptions.samplingFrequency));
                let hour = startDate.getHours() < 10 ? '0' + startDate.getHours() : startDate.getHours();
                let minute = startDate.getMinutes() < 10 ? '0' + startDate.getMinutes() : startDate.getMinutes();
                let second = startDate.getSeconds() < 10 ? '0' + startDate.getSeconds() : startDate.getSeconds();
                return hour + ':' + minute + ':' + second;
            },
            createYstartPoses(num) {
                let arr = [];
                let start = 0;
                if (num === 1) {
                    arr.push(this.isEcgMain ? 160 : start);
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
            //====================绘图相关函数======================
            //画心电图
            init(clear) {
                this.addRulerState = false;
                this.resetAddRuler();
                this.resetMenus(true);
                this.initInteractionCanvas(clear);
                this.initCanvas(clear);
                this.$emit('currentEcgPosChange', this.timeOffsetPoints);
            },
            initCanvas(clear) {
                let c_canvas = this.$refs['ecgCanvas'];
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                if (!clear) {
                    this.drawGrid(c_canvas, this.canvasOptions);
                }
            },
            drawGrid(c_canvas, options) {
                let {data, x_start_pos, x_end_pos, y_start_pos, y_height, tagData, frequency, add, rhythm} = {...options};
                this.drawEcg(c_canvas, data, x_start_pos, x_end_pos, y_start_pos, frequency, add, y_height);
            },
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
                let begin = true;
                context.strokeStyle = normalColor;
                context.font = "10pt Calibri";
                context.beginPath();
                context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);

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
                        if (this.isEcgMain) {
                            context.fillText(`${this.calcEcgTime(i + this.timeOffsetPoints)}`
                                , xPosition - 60, y_start_pos[index] + y_height / 2);
                        } else {
                            context.fillText(`${this.calcEcgTime(i + this.timeOffsetPoints)}`
                                , xPosition, y_start_pos[index] + 20);
                        }
                        context.moveTo(xPosition, y_start_pos[index] + y_height / 2);
                    } else {
                        if (begin) {
                            if (yPosition) {
                                begin = false;
                                context.moveTo(xPosition, yPosition);
                            }
                        } else {
//                            if (!yPosition) {
//                                begin = true;
//                                context.stroke();
//                                context.beginPath();
//                            }else {
//                                context.lineTo(xPosition, yPosition);
//                            }
                            context.lineTo(xPosition, yPosition);
                        }
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
            initInteractionCanvas(clear) {
                let c_canvas = this.$refs['interactionCanvas'];
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                if (!clear) {
                    this.drawInteractionGrid(c_canvas, this.canvasOptions);
                }
            },
            drawInteractionGrid(c_canvas, options) {
                let {data, x_start_pos, x_end_pos, y_start_pos, y_height, tagData, frequency, add, rhythm} = {...options};
                if (this.viewBeatsState) {
                    this.drawBeatsBar(c_canvas, x_start_pos, x_end_pos, y_start_pos, tagData, frequency, this.barColor);
                }
                if (this.viewRhythmState) {
                    this.drawRhythmBar(c_canvas, x_start_pos, x_end_pos, y_start_pos, rhythm, frequency, this.barColor, this.viewRhythmEndState);
                }
                if (this.addRhythmState) {
                    this.drawAddRhythmBar(c_canvas, x_start_pos, x_end_pos, y_start_pos, tagData, frequency, 'rgba(208,57,52,0.5)');
                }
                if (this.addRulerArea.startX && this.addRulerArea.endX) {
                    this.drawRuler(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                }
                if (this.rightClickMenuSelect.start !== null || this.rightClickMenuSelect.end !== null) {
                    this.drawSetBeatBatchBar(c_canvas, x_start_pos, x_end_pos, y_start_pos, tagData, frequency, 'rgba(208,57,52,0.5)');
                }
                this.drawRhythm(c_canvas, x_start_pos, x_end_pos, y_start_pos, rhythm, frequency, y_height);
                this.drawTags(c_canvas, x_start_pos, x_end_pos, y_start_pos, tagData, frequency);
                this.drawHr(c_canvas);
            },
            drawTags(c_canvas, x_pos, x_end_pos, y_start_pos, tagDataS, frequency) {
                this.currentPageTags = [];
                let currentIndex = this.findCurrentIndex(true, tagDataS);
                currentIndex = currentIndex < 0 ? 0 : currentIndex;
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
                let draw_cycle = true;
                this.currentPageTags.map((item, index) => {
                    //此判断为了兼容之前假删的心拍数据，之后均为真删，就不存在state为0的拍
                    // if (item.state !== 0) {
                    //
                    // }
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
                    //是否显示RR间期和心率
                    if (this.RRShowState) {
                        let minDistance = 35;//显示的RR间期离心电图左右边界的最小距离,避免文字重叠
                        let rrXpos = 0, rrYpos = yPosition, rr = 0, rate = 0;
                        draw_cycle = true;
                        if (index > 0) {
                            let preTagRowIndex = parseInt((this.currentPageTags[index - 1].p - this.timeOffsetPoints) / frequency);
                            let preTagXpos = ((this.currentPageTags[index - 1].p - this.timeOffsetPoints) % frequency) / frequency * (x_end_pos - x_pos) + x_pos - 3;
                            rr = parseInt((item.p - this.currentPageTags[index - 1].p) / this.ecgOptions.samplingFrequency * 1000);
                            draw_cycle = this.beatInNoise(this.currentPageNoise, item.p, this.currentPageTags[index - 1].p);
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
                                rr = parseInt((item.p - tagDataS[firstIndex].p) / this.ecgOptions.samplingFrequency * 1000);
                                draw_cycle = this.beatInNoise(this.currentPageNoise, item.p, tagDataS[firstIndex].p);
                            } else {
                                rr = parseInt((item.p - 0) / this.ecgOptions.samplingFrequency * 1000);
                                draw_cycle = this.beatInNoise(this.currentPageNoise, item.p, 0);
                            }
                            if (xPosition - x_pos >= minDistance) {
                                rrXpos = x_pos;
                            } else {
                                rrXpos = x_pos - minDistance;
                            }
                        }
                        rate = parseInt(60000 / rr);
                        if (draw_cycle) {
                            this.fillRRorRate(true, context, rr, rrXpos, rrYpos);
                            this.fillRRorRate(false, context, rate, rrXpos, rrYpos + 15);
                        }
                    }
                });
            },
            fillRRorRate(isRR, context, v, x, y) {
                context.fillStyle = isRR ? Util.sTag : Util.vTag;
                context.fillText(v, x, y);
            },
            //判断两个心拍之间是否包含噪音
            beatInNoise(noises, beatP, preBeatP) {
                for (let j = 0; j < noises.length; j++) {
                    let rhyLen = noises[j].end - noises[j].begin;
                    if (rhyLen + (beatP - preBeatP) > Math.max(beatP, noises[j].end) - Math.min(preBeatP, noises[j].begin)) {
                        return false
                    }
                }
                return true
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
                if (xPosition + textWidth > this.canvasWidth) {
                    xPosition = this.canvasWidth - textWidth;
                }
                if (!end) {
                    if (tempType === 'LRR') {
                        context.fillText(`${type}`, xPosition, yPosition - 12);
                    } else if (tempType === 'MAXHR' || tempType === 'MINHR') {
                        context.fillText(`${rhythmStartSymbol}${type}`, xPosition, yPosition - 12);
                    } else if (tempType === 'AF' || tempType === 'AFLUT') {
                        context.fillText(`${rhythmStartSymbol}${type}`, xPosition, yPosition + 24);
                    } else {
                        context.fillText(`${rhythmStartSymbol}${type}`, xPosition, yPosition + 12);
                    }
                } else {
                    if (isSamePos) {
                        context.fillText(`${rhythmEndSymbol}`, xPosition + textWidth, yPosition + 12);
                    } else if (tempType === 'MAXHR' || tempType === 'MINHR') {
                        context.fillText(`${type}${rhythmEndSymbol}`, xPosition, yPosition - 24);
                    } else if (tempType === 'AF' || tempType === 'AFLUT') {
                        context.fillText(`${type}${rhythmEndSymbol}`, xPosition, yPosition - 12);
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
            //画节拍导航的柱子
            drawBeatsBar(c_canvas, x_pos, x_end_pos, y_start_pos, tagData, frequency, barColor) {
                if (this.currentUpdateIndex === -1 || !this.isBarInCurrentPageEcg(tagData[this.currentUpdateIndex].p)) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                context.fillStyle = barColor;
                let index = parseInt((tagData[this.currentUpdateIndex].p - this.timeOffsetPoints) / frequency);
                let xPosition = ((tagData[this.currentUpdateIndex].p - this.timeOffsetPoints) % frequency) / frequency * (x_end_pos - x_pos) + x_pos - 12.5;
                let yPosition = y_start_pos[index] + this.grid.top;
                context.fillRect(xPosition, yPosition, 25, this.barHeight);
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
                    context.strokeRect(xPosition, yPosition, 25, this.barHeight);
                } else {
                    context.fillRect(xPosition, yPosition, 25, this.barHeight);
                }
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
                        let yPosition = y_start_pos[index] + this.grid.top;
                        context.fillRect(xPosition, yPosition, 25, 100);
                    }
                });
            },
            // 拖拽相关的操作,电子标尺，右键菜单等功能
            drawRuler(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height) {
                const heightToAddMap = {
                    5: {
                        height: 60,
                        shiftPos: 40
                    },
                    10: {
                        height: 90,
                        shiftPos: 25
                    },
                    20: {
                        height: 100,
                        shiftPos: 35
                    },
                    40: {
                        height: 140,
                        shiftPos: 0
                    },
                    60: {
                        height: 200,
                        shiftPos: -20
                    }
                };
                y_start_pos = this.createYstartPoses(this.ecgOptions.pageRows[this.add]);
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
                let splitIndexStart = y_start_pos.indexOf(startY - this.grid.top);
                let splitIndexEnd = y_start_pos.indexOf(endY - this.grid.top);
                if (splitIndexStart === -1) splitIndexStart = 0;
                if (splitIndexEnd === -1) splitIndexEnd = this.ecgOptions.pageRows[this.add];
                if (splitIndexStart === splitIndexEnd) {
                    context.fillRect(startX, y_start_pos[splitIndexStart] + shiftPos, endX - startX, height);
                } else {
                    if (this.addRulerDrawWay === 'right') {
                        context.fillRect(startX, y_start_pos[splitIndexStart] + shiftPos, x_end_pos - startX, height);
                        for (let i = splitIndexStart + 1; i < splitIndexEnd; i++) {
                            context.fillRect(this.grid.left, y_start_pos[i] + shiftPos, this.canvasWidth - this.grid.left - this.grid.right, height);
                        }
                        context.fillRect(this.grid.left, y_start_pos[splitIndexEnd] + shiftPos, endX - this.grid.left, height);
                    } else {
                        context.fillRect(startX, y_start_pos[splitIndexStart] + shiftPos, x_end_pos - startX, height);
                        for (let i = splitIndexStart + 1; i < splitIndexEnd; i++) {
                            context.fillRect(this.grid.left, y_start_pos[i] + shiftPos, this.canvasWidth - this.grid.left - this.grid.right, height);
                        }
                        context.fillRect(this.grid.left, y_start_pos[splitIndexEnd] + shiftPos, endX - this.grid.left, height);
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
            },
            //画背景格
            drawBigGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.beginPath();
                context.strokeRect(x_pos + 0.5, 0.5, x_end_pos - x_pos - 0.5, this.canvasHeight - 0.5);
                context.moveTo(x_pos, this.grid.top + 0.5);
                context.lineTo(x_end_pos, this.grid.top + 0.5);
                context.stroke();
            },
            drawMediumGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#c3c3dc";
                context.beginPath();
                for (let x = x_pos; x < x_end_pos; x += 25) {
                    context.moveTo(x + 0.5, this.grid.top + 0.5);
                    context.lineTo(x + 0.5, this.canvasHeight - this.grid.bottom - 0.5);
                }
                for (let y = this.grid.top; y < this.canvasHeight - this.grid.bottom; y += 25) {
                    context.moveTo(x_pos + 0.5, y + 0.5);
                    context.lineTo(x_end_pos, y + 0.5);
                }
                context.stroke();
            },
            drawSmallGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_end_pos) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#d7e7ed";
                context.beginPath();
                for (let x = x_pos; x <= x_end_pos; x += 5) {
                    context.moveTo(x + 0.5, this.grid.top + 0.5);
                    context.lineTo(x + 0.5, this.canvasHeight - this.grid.bottom - 0.5);
                }
                for (let y = this.grid.top; y <= this.canvasHeight - this.grid.bottom; y += 5) {
                    context.moveTo(x_pos + 0.5, y + 0.5);
                    context.lineTo(x_end_pos, y + 0.5);
                }
                context.stroke();
            },
            drawBackgroundGrid() {
                let c_canvas = this.$refs['backgroundCanvas'];
                let {x_start_pos, x_end_pos, y_start_pos, y_height} = {...this.canvasOptions};
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                //                绘制网格线
                this.drawSmallGrid(c_canvas, this.isEcgMain ? this.grid.left - 100 : 0,
                    this.isEcgMain ? (c_canvas.width - this.grid.right) : c_canvas.width, y_start_pos, y_height);
                this.drawMediumGrid(c_canvas, this.isEcgMain ? this.grid.left - 100 : 0,
                    this.isEcgMain ? (c_canvas.width - this.grid.right) : c_canvas.width, y_start_pos, y_height);
                if (!this.isEcgMain) {
                    this.drawBigGrid(c_canvas, 0, c_canvas.width, y_start_pos, y_height);
                }
            },
            drawHr(c_canvas) {
                let averageHeart = this.heartRates.length === 0 ? 0 : this.heartRates[this.dateIndex].data[this.minutesOffset];
                let context = c_canvas.getContext("2d");
                context.fillStyle = '#4650e1';
                context.font = "10pt Calibri";
                let hrXpos = this.isEcgMain ? this.canvasWidth - this.grid.right - 80 : this.canvasWidth - this.grid.right + 40;
                let hrYpos = this.grid.top + 15;
                context.fillText(`HR: ${averageHeart} bpm`, hrXpos, hrYpos);
                context.fillText(`25mm/s`, hrXpos + 20, hrYpos + 20);
                context.fillText(`${this.add}mm/mv`, hrXpos - 40, hrYpos + 20);
            },

            //二分查找法去查找当前页对应的tag或rhythm数组的索引
            findCurrentIndex(isTag, data, timeOffsetPoints = this.timeOffsetPoints) {
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = parseInt((l + r) / 2);
                    let currentP = isTag ? data[mid].p : data[mid].begin;
                    if (currentP < timeOffsetPoints) {
                        l = mid + 1;
                    } else if (currentP > timeOffsetPoints) {
                        r = mid - 1;
                    } else {
                        return mid - 2;
                    }
                }
                return l - 1;
            },
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
                if (data[mid].type === 'CUSTOM' ? data[mid].title : data[mid].type === type) {
                    return mid;
                }
                let pos = data[mid].begin;

                function find(direction) {
                    while (true) {
                        mid += direction;
                        if (mid < 0 || mid === data.length) {
                            return -1;
                        }
                        if (data[mid].type === 'CUSTOM' ? data[mid].title : data[mid].type === type) {
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
            //更新当前缓存的tag,以当前小时为中心前后再取一小时
            getHoursTagRhythm(currentDateHour) {
                let requestId = this.ecgViewer.getRequestId();
                this.getTagsReq(currentDateHour, (res) => {
                    let tagRhythm = res.data;
                    if (this.currentUpdateIndex >= 0) {
                        this.preTagPos = this.tagPos[this.currentUpdateIndex].p;
                    }
                    if (this.currentRhythmIndex >= 0) {
                        this.preRhyPos = this.rhythm[this.currentRhythmIndex].begin;
                        this.preRhyType = this.rhythm[this.currentRhythmIndex].type;
                    }
                    this.getHoursTagFollow(tagRhythm);
                }, requestId);
            },
            getTagsReq(currentDateHour, callback, requestId) {
                let startTime = 0;
                let endTime = new Date(currentDateHour).setHours(new Date(currentDateHour).getHours() + 2);
                let startP, endP;
                if ((new Date(currentDateHour).getTime() - new Date(this.ecgStartTime).getTime()) < 60 * 60 * 1000) {
                    startP = 0;
                } else {
                    startTime = new Date(currentDateHour).setHours(new Date(currentDateHour).getHours() - 1);
                    startP = (startTime - new Date(this.ecgStartTime).getTime()) / 1000 * this.ecgOptions.samplingFrequency;
                }
                endP = (endTime - new Date(this.ecgStartTime).getTime()) / 1000 * this.ecgOptions.samplingFrequency;
                axios.get('/ecg/abnormal_list', {
                    headers: {
                        'id': requestId || 0
                    },
                    params: {
                        report_id: this.report_id,
                        start: startP,
                        end: endP
                    }
                }).then(res => {
                    callback(res);
                });
            },
            getHoursTagFollow(tagRhythm) {
                this.tagPos = tagRhythm.tagPos;
                this.rhythm = tagRhythm.rhythm;
                this.$emit('tagsChange', {tagPos: this.tagPos, rhythm: this.rhythm});
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
                this.init();//需重绘心电和心拍心律
            },
            onMouseWheel(event) {
                event.preventDefault();
                let down = true; // 定义一个标志，当滚轮向下滚时，执行一些操作
                down = event.wheelDelta ? event.wheelDelta < 0 : event.detail > 0;
                this.scrollStartTime = new Date().getTime();
                if (this.scrollEndTime - this.scrollStartTime < -100) {//100ms内再次滚动不会重绘图形
                    if (down) {
                        this.ecgViewer.moveTo(Math.floor(this.ecgViewer.getOffset() + this.pagePointsSum));
                    } else {
                        this.ecgViewer.moveTo(Math.floor(this.ecgViewer.getOffset() - this.pagePointsSum));
                    }
                    if (!this.viewState) {
                        this.updateTagRhythmIndex(this.tagPos, this.rhythm);
                    }
                }
                this.scrollEndTime = new Date().getTime();
            },
            scrollEcgRow(event) {
                if (event.keyCode === 38) {
                    this.scrollEcgRowDo(false);//按向上箭头
                } else if (event.keyCode === 40) {
                    this.scrollEcgRowDo(true);//按向下箭头
                }
            },
            scrollEcgRowDo(isDown) {
                if (isDown) {
                    this.ecgViewer.moveTo(Math.floor(this.ecgViewer.getOffset() + this.pointsRow));
                } else {
                    this.ecgViewer.moveTo(Math.floor(this.ecgViewer.getOffset() - this.pointsRow));
                }
                if (!this.viewState) {
                    this.updateTagRhythmIndex(this.tagPos, this.rhythm);
                }
            },
            preventDefaultScrollRow(event) {
                if (event.keyCode === 38 || event.keyCode === 40) {
                    event.preventDefault();
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
                this.calcBeatBar(this.tagPos);
                this.$emit('hasOperate');
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
                this.calcBeatBar(this.tagPos);
                this.$emit('hasOperate');
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
                        this.initInteractionCanvas();
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
            //用于从其他导航状态切换到节拍导航时，需要重置其他导航状态
            viewTagReset() {
                if (this.viewRhythmState || this.addBeatState || this.batchOperationState) {
                    this.reset({keyCode: 27});
                }
            },
            //用于从其他导航状态切换到节律导航时，需要重置其他导航状态
            viewRhythmReset(isPrev) {
                if (this.viewBeatsState || this.addBeatState || this.batchOperationState) {
                    if (this.viewBeatsState) {
                        this.reset({keyCode: 27}, false, true);
                    } else {
                        this.reset({keyCode: 27});
                    }
                    //按Q键保证往前找最近相邻的，否则会找到上上个心律
                    if (isPrev) {
                        this.currentRhythmIndex++;
                    }
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
                    this.viewRhythmReset(true);
                    let originalPosition = this.currentRhythmIndex;
                    this.viewRhythmEndState=false;
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
                    this.$emit('hasOperate');
                    this.$emit('clearRhythmTypeSelected');
                } else if (event.keyCode === 69) {//'E'键
                    if (this.rhythm.length === 0) {
                        this.$message({
                            message: '无异常心律信息！',
                            type: 'warning'
                        });
                        return
                    }
                    this.viewRhythmReset(false);
                    let originalPosition = this.currentRhythmIndex;
                    this.viewRhythmEndState=false;
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
                    this.$emit('hasOperate');
                    this.$emit('clearRhythmTypeSelected');
                } else if (event.keyCode === 82) {//'R'键
                    if (this.viewRhythmState) {
                        this.viewRhythmEndState = true;
                        this.cacheRhythm = this.rhythm[this.currentRhythmIndex];
                        this.calcRhythmJump(this.rhythm, this.viewRhythmEndState);
                        this.$emit('clearRhythmTypeSelected');
                    }
                }
            },
            //清除掉10秒心电图
            clear() {
                this.reset({keyCode: 27}, true);
                this.init(true);
            },
            //Esc键重置当前状态
            reset(event, part, isViewBeat) {
                if (event.keyCode === 27) {
                    if (isViewBeat) {
                        this.currentRhythmIndex = this.findCurrentIndex(false, this.rhythm, this.tagPos[this.currentUpdateIndex].p);
                        this.currentUpdateIndex = this.findCurrentIndex(true, this.tagPos);
                    } else {
                        this.updateTagRhythmIndex(this.tagPos, this.rhythm);//保证再次按w,a,s,d时，心拍和心律从当前页或者离当前页最近的地方开始
                    }
                    this.viewBeatsState = false;
                    this.viewSimilarBeatsState = false;
                    this.barColor = this.barColorMap.beat;
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
                        this.initInteractionCanvas();
                    }
                }
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
            abnormalNavigation(isTag, tagRhy, action) {
                if (!this.abnormalNavigationLoading) {
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

            //判断当前导航指示柱是否在当前心电图内
            isBarInCurrentPageEcg(pos) {
                return pos >= this.timeOffsetPoints && pos < this.timeOffsetPoints + this.pagePointsSum;
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
                if ((position >= this.timeOffsetPoints + this.pagePointsSum)
                    || (position < this.timeOffsetPoints)) {
                    let offsetRow = Math.floor(position / this.pointsRow);
                    this.ecgViewer.moveTo(offsetRow * this.pointsRow);
                } else {
                    this.initInteractionCanvas();
                }
            },

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
                                    this.$emit('beatChange');
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
                                    this.$emit('beatChange');
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
                                    this.$emit('beatChange');
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
                                    this.$emit('beatChange');
                                });
                            }
                            break;
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
            deleteBeat(event) {
                if (this.viewBeatsState) {
                    if (event.keyCode === 46) {//按'Delete'键
                        if (this.tagPos[this.currentUpdateIndex].state !== 1) {//当前事件不处于被选中为报告用图状态才能删除
                            axios.delete(`/beats/${this.report_id}`, {data: {positions: [this.tagPos[this.currentUpdateIndex].p]}}).then(() => {
                                this.$emit('beatChange');
                            })
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

                                });
                            } else {
                                this.asyncUserSignTagRhythm(false, true, true, this.rhythm[this.currentRhythmIndex].begin, this.rhythm[this.currentRhythmIndex].type, () => {

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
            //选为报告用图
            useReport(event) {
                if (event.keyCode === 85) {//'u键弹起时触发'
                    if (this.viewRhythmState) {
                        if (this.rhythm[this.currentRhythmIndex].type === 'NOISE') {//噪声不能留图
                            return;
                        }
                        if (this.rhythm[this.currentRhythmIndex].state !== 0) {//当前事件不处于删除状态才能选中为报告用图
                            if (this.rhythm[this.currentRhythmIndex].state === undefined) {
                                this.asyncUserSignTagRhythm(false, false, false, this.rhythm[this.currentRhythmIndex].begin, this.rhythm[this.currentRhythmIndex].type, () => {
                                    this.rhythm[this.currentRhythmIndex].state = 1;
                                    this.initInteractionCanvas();
                                });
                            } else {
                                this.asyncUserSignTagRhythm(false, false, true, this.rhythm[this.currentRhythmIndex].begin, this.rhythm[this.currentRhythmIndex].type, () => {
                                    delete this.rhythm[this.currentRhythmIndex].state;
                                    this.initInteractionCanvas();
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
            //查看手动事件
            viewSymbol(event) {
                if (event.keyCode === 90) {//'Z键'
                    if (this.symbols.length === 0) {
                        return;
                    }
                    if (this.currentSymbolIndex > 0) {
                        this.currentSymbolIndex--;
                        this.ecgViewer.moveTo(Math.floor(this.symbols[this.currentSymbolIndex] / this.pointsRow) * this.pointsRow);
                    }
                } else if (event.keyCode === 88) {//'X键'
                    if (this.symbols.length === 0) {
                        return;
                    }
                    if (this.currentSymbolIndex < this.symbols.length - 1) {
                        this.currentSymbolIndex++;
                        this.ecgViewer.moveTo(Math.floor(this.symbols[this.currentSymbolIndex] / this.pointsRow) * this.pointsRow);
                    }
                }
            },
            //鼠标点击快速选中对应的心拍
            fastSelectTag(event) {
                this.$emit('hasOperate');
                if (event.buttons === 1) {
                    //点击鼠标左键，清除掉起始点设定位置
                    this.rightClickMenuSelect = {
                        start: null,
                        end: null
                    };
                }
                this.$message.closeAll();
                if (!this.addBeatState && event.ctrlKey) return;
                let {x, y} = this.getMousePos(event);
                let relativeClickPos = Math.floor(Math.floor(x - this.grid.left) * (this.pointsRow / (this.canvasWidth - this.grid.left - this.grid.right))
                    + Math.floor((y - this.grid.top) / this.ecgOptions.pageRowsAdd[this.add]) * this.pointsRow);
                let mouseClickPos = relativeClickPos + this.timeOffsetPoints;//鼠标点击位置对应于整个心电的绝对索引值
                if (this.addBeatState) {
                    if (event.ctrlKey) {//按住CTRL键点击添加心拍
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
                    return;
                } else if (this.addRhythmState) {
                    this.viewBeatsState = false;//当前是选择添加节律的起点与终点
                    this.viewRhythmState = false;
                    this.viewSimilarBeatsState = false;
                    this.$emit('clearRhythmTypeSelected');
                } else {
                    //清除与选中心拍无关的鼠标事件状态,即当前为选中心拍
                    this.viewRhythmState = false;
                    this.viewSimilarBeatsState = false;
                    this.barColor = this.barColorMap.beat;//指示柱变为绿色
                    this.viewBeatsState = true;
                }
                this.addRulerArea = {};
                this.addRulerState = false;
                this.addRulerExist = false;
//                this.initInteractionCanvas();
                if (this.currentPageTags.length !== 0) {
                    let minApartTag = this.findNearestBeat(mouseClickPos, this.currentPageTags);
                    if (this.addRhythmState) {
                        if (this.addRhythmPos.length === 1 && this.addRhythmPos[0] === minApartTag.p) {//添加事件如果是同一个心拍，则此次操作无效
                            return;
                        }
                        if (this.addRhythmPos.length === 2) {
                            this.addRhythmPos = [];
                        }
                        this.addRhythmPos.push(minApartTag.p);
                    } else {
                        this.currentUpdateIndex = this.resetTagRhythmIndex(true, this.tagPos, minApartTag.p);
                        this.batchPos={
                            from:this.tagPos[this.currentUpdateIndex].p,
                            to:this.tagPos[this.currentUpdateIndex].p,
                            fromBeat:this.tagPos[this.currentUpdateIndex].p,
                            toBeat: this.tagPos[this.currentUpdateIndex].p
                        }
                    }
                    this.initInteractionCanvas();
                } else {
                    this.$message({
                        message: '当前页面无心拍可选！',
                        type: 'warning'
                    });
                }
            },
            //获取鼠标相对于心电canvas的位置
            getMousePos(event) {
                let canvas = this.$refs.interactionCanvas;
                let rect = canvas.getBoundingClientRect();
                let x = event.clientX - rect.left * (canvas.width / rect.width);
                let y = event.clientY - rect.top * (canvas.height / rect.height);
                return {x, y};
            },
            //获取鼠标点击位置附近的心拍
            findNearestBeat(mouseClickPos, currentPageTags) {
                let minApart = Math.abs(currentPageTags[0].p - mouseClickPos);//记录离点击位置最近的距离，方便找出对应的tag
                let minApartTag = currentPageTags[0];
                for (let i = 1; i < currentPageTags.length; i++) {
                    let apart = Math.abs(currentPageTags[i].p - mouseClickPos);
                    if (apart < minApart) {
                        minApart = apart;
                        minApartTag = currentPageTags[i];
                    }
                }
                return minApartTag;
            },
            addBeat(event) {
                if (event.keyCode === 18) {//'Alt键'
                    this.reset({keyCode: 27});
                    this.addBeatState = true;
                    this.$emit('hasOperate');
                }
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
                        this.$emit('beatChange');
                    }).finally(() => {
                        this.reset({keyCode: 27}, true);
                    });
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
            addRhythm(event) {
                if (event.keyCode === 187 || event.keyCode === 61 || event.keyCode === 107) {
                    this.addRhythmState = true;
                    this.$emit('hasOperate');
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
                    this.$emit('clearRhythmTypeSelected');
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
                    this.$emit('clearRhythmTypeSelected');
                }).finally(() => {
                    this.addAllEvents();
                });
            },
            changeAddRulerState(event) {
                if (this.addRulerState !== event.ctrlKey) {
                    this.addRulerState = event.ctrlKey;
                }
                //当前不为添加心拍状态，按住ctrl键，进入电子标尺状态，清空批量拖拽状态
                if (event.ctrlKey) {
                    if (!this.addBeatState) {
                        this.addRulerState = true;
                        this.batchOperationState = false;
                    }
                }
            },
            resetAddRuler() {
                this.addRulerArea = {};
                this.addRulerExist = false;
                this.onDrawRulerState = false;
            },
            moving(event, setRulerLineStart = false, setRulerLineEnd = false) {
                let {x, y} = this.getMousePos(event);
                let offsetRow = Math.floor((y - this.grid.top) / this.ecgOptions.pageRowsAdd[this.add]);
                if (offsetRow > this.ecgOptions.pageRows[this.add] - 1) {
                    return;
                }
                if (offsetRow === -1) offsetRow = 0;
                let addBeatLineY = offsetRow * this.ecgOptions.pageRowsAdd[this.add] + this.grid.top;
                if (this.add === 40 || this.add === 60) {
                    addBeatLineY = this.grid.top + 160;
                }
                if (x >= this.grid.left && x < this.canvasWidth - this.grid.right
                    && y >= this.grid.top && y < this.canvasHeight - this.grid.bottom) {
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
                        };
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
                        this.addRulerArea = {
                            ...this.addRulerArea,
                            endX: x,
                            endY: addBeatLineY
                        };
                    }
                }
                if (this.addRulerExist) {
                    let restWidth = 0;
                    let changeStartX = 0;
                    let changeStartY = 0;
                    let leftBoundary = this.grid.left;
                    let rightBoundary = this.canvasWidth - this.grid.right;//心电图的左右边界
                    if (x <= leftBoundary) {
                        x = leftBoundary;
                    }
                    if (x >= rightBoundary) {
                        x = rightBoundary;
                    }
                    if (offsetRow < 0) {
                        offsetRow = 0;
                    }
                    if (this.addRulerDrawWay === 'left') {
                        if ((x + this.addRulerArea.width) <= rightBoundary) {
                            changeStartX = x + this.addRulerArea.width;
                            changeStartY = addBeatLineY;
                        } else {
                            restWidth = x + this.addRulerArea.width - rightBoundary;
                            let restFullLineNum = Math.floor(restWidth / (rightBoundary - leftBoundary));
                            if (restFullLineNum === 0) {
                                changeStartX = this.grid.left + restWidth;
                                changeStartY = (offsetRow + 1) * this.ecgOptions.pageRowsAdd[this.add] + this.grid.top;
                            } else {
                                changeStartX = this.grid.left + restWidth % (rightBoundary - leftBoundary);
                                changeStartY = (offsetRow + restFullLineNum + 1) * this.ecgOptions.pageRowsAdd[this.add] + this.grid.top;
                            }
                        }
                    } else {
                        if ((x - this.grid.left) >= this.addRulerArea.width) {
                            changeStartX = x - this.addRulerArea.width;
                            changeStartY = addBeatLineY;
                        } else {
                            restWidth = this.addRulerArea.width - (x - this.grid.left);
                            let restFullLineNum = Math.floor(restWidth / (rightBoundary - leftBoundary));
                            if (restFullLineNum === 0) {
                                changeStartX = rightBoundary - restWidth;
                                changeStartY = (offsetRow - 1) * this.ecgOptions.pageRowsAdd[this.add] + this.grid.top;
                            } else {
                                changeStartX = rightBoundary - restWidth % (rightBoundary - leftBoundary);
                                changeStartY = (offsetRow - restFullLineNum - 1) * this.ecgOptions.pageRowsAdd[this.add] + this.grid.top;
                            }
                        }
                    }
                    if (changeStartY < 0) changeStartX = this.grid.left;
                    if (changeStartY < 0) changeStartY = this.grid.top;
                    if (addBeatLineY < 0) addBeatLineY = this.grid.top;
                    this.addRulerArea = {
                        startX: changeStartX,
                        startY: changeStartY,
                        endX: x,
                        endY: addBeatLineY,
                        width: this.addRulerArea.width
                    };
                }
                //鼠标移动时，在电子标尺或者拖拽修改状态时才重绘,避免不必要的渲染
                if (this.addRulerArea.startX && this.addRulerArea.endX
                    && !(this.batchOperationState && !this.onDrawRulerState)
                    && !(this.addRulerArea.endY === this.addRulerArea.startY && (Math.abs(this.addRulerArea.endX - this.addRulerArea.startX) < 3))
                ) {
                    this.initInteractionCanvas();
                }
            },
            dragStart(event) {
                //电子标尺
                this.resetAddRuler();
                if (this.addRulerState || event.buttons === 1) {
                    this.onDrawRulerState = true;
                    this.moving(event, true, false);
                }
                //批量修改
                this.batchKeyChangeBeatState = false;
                if (event.buttons === 1) {
                    this.batchMenuShowState = {
                        parent: false,
                        child: false
                    };
                    this.rightClickMenuShowState = false;
                }
            },
            dragEnd(e) {
                this.batchDragEndPos = this.getMousePos(e);
                this.batchChildMenu.x = this.batchDragEndPos.x + 100;
                if (this.batchDragEndPos.y > this.canvasHeight - 150) {
                    this.batchDragEndPos.y = this.canvasHeight - 150;
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
            },
            calcAddRulerLength() { //计算电子分规的长度
                if (JSON.stringify(this.addRulerArea) !== '{}' && this.addRulerArea.startX !== 0 && this.addRulerArea.endX !== 0) {
                    let ecgWidth = this.canvasWidth - this.grid.left - this.grid.right;
                    let yStartPos = this.ecgOptions.yStartPoses[this.add];
                    let {startX, startY, endX, endY} = this.addRulerArea;
                    if (this.addRulerDrawWay === 'left') {
                        startX = this.addRulerArea.endX;
                        startY = this.addRulerArea.endY;
                        endX = this.addRulerArea.startX;
                        endY = this.addRulerArea.startY;
                    }
                    let splitIndex = yStartPos.indexOf(endY - this.grid.top) - yStartPos.indexOf(startY - this.grid.top); //两行相差的index
                    let splitLength = 0;
                    if (splitIndex === 0) {
                        splitLength = endX - startX;
                    } else {
                        splitLength = (splitIndex - 1) * ecgWidth + ecgWidth - startX + endX; //计算总宽度
                    }
                    this.addRulerArea = {
                        ...this.addRulerArea,
                        width: splitLength
                    };
                } else {
                    this.addRulerExist = false;
                }
            },
            //心电图上的物理像素转为心电绝对索引
            mousePosToEcgAbsPos(x, y) {
                let relativeClickPos = Math.floor(Math.floor(x - this.grid.left) * (this.pointsRow / (this.canvasWidth - this.grid.left - this.grid.right))
                    + Math.floor((y - this.grid.top) / this.ecgOptions.pageRowsAdd[this.add]) * this.pointsRow);
                return relativeClickPos + this.timeOffsetPoints;//鼠标点击位置对应于整个心电的绝对索引值
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
            rhythmTypeLabel(value) {
                return Util.rhythmTranslateMap[value] || value
            },
            //===================批量修改相关方法=========
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
                        this.batchChildMenu.height = this.canvasHeight;
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
                        this.$emit('beatChange');
                        break;
                    case 'batchDeleteBeat':
                        this.currentBatchAction.type = 'batchDeleteBeat';
                        this.childMenuItems = [];
                        this.resetMenus();
                        let batchDeleteStartIndex=Util.findCurrentIndex(true,this.tagPos,this.batchPos.fromBeat).index;
                        let batchDeleteEndIndex=Util.findCurrentIndex(true,this.tagPos,this.batchPos.toBeat).index;
                        let batchDeleteBeatsPos=this.tagPos.slice(batchDeleteStartIndex,batchDeleteEndIndex+1).map(beat=>{
                            return beat.p
                        });
                        axios.delete(`/beats/${this.report_id}`, {data: {positions: batchDeleteBeatsPos}}).then(() => {
                            this.$emit('beatChange');
                        });
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
                            this.reset({keyCode: 27});
                            this.$emit('beatChange');
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
                //避免鼠标右键菜单与电子标尺冲突
                if (this.addRulerArea.startX && this.addRulerArea.endX &&
                    !(this.addRulerArea.endY === this.addRulerArea.startY && (Math.abs(this.addRulerArea.endX - this.addRulerArea.startX) < 3))
                ) {
                    return false;
                }
                if (this.rightClickMenuSelect.start !== null && this.rightClickMenuSelect.end !== null) {
                    //清除掉右键起始点设定
                    this.rightClickMenuSelect = {
                        start: null,
                        end: null
                    };
                    this.initInteractionCanvas();
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
                this.initInteractionCanvas();
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
                                this.reset({keyCode: 27});
                                this.$emit('beatChange');
                            });
                            this.resetMenus();
                            break;
                        case 50:
                        case 98:
                            this.asyncUpdateTagRhythm(true, {
                                from: this.batchPos.from,
                                to: this.batchPos.to
                            }, 'V', (res) => {
                                this.reset({keyCode: 27});
                                this.$emit('beatChange');
                            });
                            this.resetMenus();
                            break;
                        case 51:
                        case 99:
                            this.asyncUpdateTagRhythm(true, {
                                from: this.batchPos.from,
                                to: this.batchPos.to
                            }, 'S', (res) => {
                                this.reset({keyCode: 27});
                                this.$emit('beatChange');
                            });
                            this.resetMenus();
                            break;
                        case 52:
                        case 100:
                            this.asyncUpdateTagRhythm(true, {
                                from: this.batchPos.from,
                                to: this.batchPos.to
                            }, 'Q', (res) => {
                                this.reset({keyCode: 27});
                                this.$emit('beatChange');
                            });
                            this.resetMenus();
                            break;
                    }
                }
            },
            //批量删除心拍
            batchDeleteBeat(){

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
            },
            //供内部测试人员使用，截取最近显示的一分钟心电(当前显示的是48秒的话，心电索引向前取6秒)
            downloadEcg(event) {
                if (event.ctrlKey && event.keyCode === 66) {//'ctrl+B组合键'
                    window.open(`/downloadAbnormalFragment?report_id=${this.report_id}&start_position=${this.downloadEcgIndex}`);
                }
            },
            updateTags() {
                if (!this.isClearState) {
                    this.getHoursTagRhythm(this.currentDateHour);
                }
            },
            updateVisibleData() {
                this.ecgViewer.updateVisibleData();
            },
            //外部组件调用，跳转至某个心律
            getEventEcg(row) {
                this.reset({keyCode: 27}, true);
                this.$emit('clearRhythmTypeSelected');
                let noSelectRhythmType = [];
                this.eventPos = row.position;
                this.eventType = row.title || row.label;
                if (!noSelectRhythmType.includes(row.label)) {
                    this.barColor = this.barColorMap.rhythm;
                    this.viewRhythmState = true;
                    this.eventJumpState = true;
                    let currentIndex = this.resetTagRhythmIndex(false, this.rhythm, this.eventPos, this.eventType);
                    if (currentIndex !== -1) {
                        this.currentRhythmIndex = currentIndex;
                        this.eventJumpState = false;
                    }
                }
                this.init();//需重绘心电和心拍心律
                let currentDatePos = (new Date(this.currentDateTime.split(' ')[0] + ' 00:00:00').getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * this.ecgOptions.samplingFrequency;
                if (row.position - this.pointsRow / 2 >= currentDatePos) {
                    this.ecgViewer.moveTo(row.position - this.pointsRow / 2);
                } else {
                    this.ecgViewer.moveTo(currentDatePos);
                }
            },
            //外部组件调用，跳转至某个心拍
            getBeatEcg(pos) {
                this.reset({keyCode: 27});
                this.eventPos = pos;
                this.barColor = this.barColorMap.beat;
                this.viewBeatsState = true;
                this.eventJumpState = true;
                let currentIndex = this.resetTagRhythmIndex(true, this.tagPos, pos);
                if (currentIndex !== -1) {
                    this.currentUpdateIndex = currentIndex;
                    this.eventJumpState = false;
                }
                if (pos !== -1) {
                    this.init();//需重绘心电和心拍心律
                    this.ecgViewer.moveTo(pos-this.pointsRow/2<0?0:pos-this.pointsRow/2);
                }
            },
            hideTwinkle() {
                if (this.isTwinkle) {
                    this.$emit('hideTwinkle')
                }
            },
            addAllEvents() {
                //滚动心电图
                let ecgDom = this.$refs.interactionCanvas;
                ecgDom.addEventListener('mousewheel', this.onMouseWheel);
                ecgDom.addEventListener('DOMMouseScroll', this.onMouseWheel);
                $(document).on('keyup', this.scrollEcgRow);
                $(document).on('keydown', this.preventDefaultScrollRow);
                ecgDom.oncontextmenu = this.mouseRightClick;
                // 页面任何操作都要去掉闪烁
                $(document).on('keydown', this.hideTwinkle);
                $(ecgDom).on('mousedown', this.hideTwinkle);
                ecgDom.addEventListener('mousewheel', this.hideTwinkle);
                ecgDom.addEventListener('DOMMouseScroll', this.hideTwinkle);
                //心拍心律异常的快捷键导航
                $(document).on('keyup', this.reset);
                $(document).on('keydown', this.viewBeats);
                $(document).on('keyup', this.viewAbnormal);
                $(document).on('keyup', this.viewSimilarBeats);
                $(document).on('keyup', this.viewRhythm);
                //心拍心律的增删改
                $(document).on('keyup', this.updateBeatType);
                $(document).on('keyup', this.deleteBeat);
                $(document).on('keyup', this.deleteRhythm);
                $(document).on('keyup', this.useReport);
                $(document).on('keyup', this.viewSymbol);
                $(ecgDom).on('mousedown', this.fastSelectTag);
                $(document).on('keyup', this.addBeat);
                $(document).on('keyup', this.addRhythm);
                //电子分规
                $(document).on('keydown', this.changeAddRulerState);
                $(document).on('keyup', this.changeAddRulerState);
                $(ecgDom).on('mousedown', this.dragStart);
                $(ecgDom).on('mousemove', (e) => {
                    this.moving(e, false, true);
                    //鼠标按住拖动时,需要清除一些状态，避免鼠标事件冲突
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
                        this.initInteractionCanvas();
                    }
                });
                $(ecgDom).on('mouseup', this.dragEnd);
                $(document).on('keyup', this.batchUpdateBeatType);
                $(document).on('keyup', this.downloadEcg);
            },
            removeAllEvent() {
                let ecgDom = this.$refs.interactionCanvas;
                if (ecgDom) {
                    ecgDom.removeEventListener('mousewheel', this.onMouseWheel);
                    ecgDom.removeEventListener('DOMMouseScroll', this.onMouseWheel);
                    ecgDom.oncontextmenu = null;
                    $(ecgDom).off();
                }
                $(document).off('keyup', this.scrollEcgRow);
                $(document).off('keydown', this.preventDefaultScrollRow);
                $(document).off('keyup', this.reset);
                $(document).off('keydown', this.viewBeats);
                $(document).off('keyup', this.viewAbnormal);
                $(document).off('keyup', this.viewSimilarBeats);
                $(document).off('keyup', this.viewRhythm);
                $(document).off('keyup', this.updateBeatType);
                $(document).off('keyup', this.deleteBeat);
                $(document).off('keyup', this.deleteRhythm);
                $(document).off('keyup', this.useReport);
                $(document).off('keyup', this.viewSymbol);
                $(document).off('keyup', this.addBeat);
                $(document).off('keyup', this.addRhythm);
                $(document).off('keydown', this.changeAddRulerState);
                $(document).off('keyup', this.changeAddRulerState);
                $(document).off('keyup', this.batchUpdateBeatType);
                $(document).off('keyup', this.downloadEcg);
            },
        }
    }
</script>
<style scoped>
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
        display: block !important;
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

    .canvas {
        position: absolute;
        top: 0;
        left: 0;
    }

    .add-beat-line {
        background-color: #fe010f;
    }

    .add-beat-line, .add-ruler-line {
        position: absolute;
        width: 1px;
        height: 120px;
        pointer-events: none;
        z-index: 500;
    }

    .add-ruler-line {
        background-color: #feb82c;
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