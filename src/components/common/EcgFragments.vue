<template>
    <div class="ecg-fragments-wrapper" ref="ecg-fragments-wrapper" :style="{width:wrapperSize.width+'px'}" @click.stop>
        <div class="slideWrapper">
            <canvas ref="myCavansScatter" height="6px" :width="wrapperSize.width+'px'"></canvas>
        </div>
        <el-slider v-model="slideValue" :max="pageObj.total"
                   @change="changeShowArr" v-if="hackResetSlide"></el-slider>
        <div ref="flexPaper" class="flexPaperBoxItem" v-loading="pageLoading"
             :style="{'min-height': wrapperSize.height + 'px'}">
            <div ref="selectBlock" class="selectBlockItem" draggable="false" @mousemove="noDefault"
                 @touchmove="noDefault"></div>
            <div ref="singlePaper" class="singlePaperItem" :data-pos="item.pos" draggable="false"
                 v-for="(item, index) in showArr"
                 @dragenter="noDefault"
                 :style="{'height': canvasHeight+'px'}"
                 @dragover="noDefault">
                <canvas :ref="item.pos+'scatter'" :data-pos="item.pos" :width="canvasWidth+'px'"
                        :height="canvasHeight+'px'"></canvas>
            </div>
        </div>
        <div v-if="isShowRight" class="buttonBox">
            <div style="text-align: center" v-show="selectArray.length">
                {{Math.floor(pageObj.start / pageObj.limit) + 1}} / {{Math.ceil(pageObj.total / pageObj.limit)}}
            </div>
            <div style="text-align: center" v-show="selectArray.length === 0">
                0 / 0
            </div>
            <el-select v-model="selectTypeValue" placeholder="请选择" style="width: 100px;"
                       :disabled="!selectArr.length"
                       @change="handleChangeSelect">
                <el-option
                        v-for="(item, index) in options"
                        :key="index"
                        :disabled="selectArr.length> 1&& item.type !== 'SELF'"
                        :label="item.label"
                        :value="index">
                </el-option>
            </el-select>
            <br>
            <el-button type="primary" style="margin: 1px 0 1px 0;width: 100px" @click="pageUp"
                       :disabled="pageObj.start === 0  || pageLoading">上一页
            </el-button>
            <br>
            <el-button type="primary" style="margin: 1px 0 1px 0;width: 100px" @click="pageDown"
                       :disabled="(pageObj.total <= pageObj.start + pageObj.limit) || pageLoading">下一页
            </el-button>
            <br>
            <el-button type="primary" style="margin: 1px 0 1px 0;width: 100px" @click="pageSelectAll"
                       :disabled="showArr.length === 0 || pageLoading">页全选
            </el-button>
            <br>
            <el-button type="primary" style="margin: 1px 0 1px 0;width: 100px" @click="pageReverseSelect"
                       :disabled="showArr.length === 0 || pageLoading">页反选
            </el-button>
            <br>
            <el-button type="primary" style="margin: 1px 0 1px 0;width: 100px" @click="selectAll"
                       :disabled="showArr.length === 0 || pageLoading">全选
            </el-button>
            <br>
            <el-button type="primary" style="margin: 1px 0 1px 0;width: 100px" @click="reverseSelect"
                       :disabled="showArr.length === 0 || pageLoading">反选
            </el-button>
            <br>
            <div style="border: 1px solid #ccc; padding: 8px 5px; border-radius: 2px; margin-top: 2px">
                <el-checkbox v-model="showEcgChecked" @change="changeCheckState">心电片段</el-checkbox>
            </div>
            <div style="border: 1px solid #ccc; padding: 8px 5px; border-radius: 2px; margin-top: 2px">
                <el-checkbox v-model="ctrlKeyChecked" @change="changeCtrlState">Ctrl键锁定</el-checkbox>
            </div>
            <div style="margin: 5px 0; text-align: center;font-size: 14px">已选(<span
                    style="color: #de6f21;font-size: 14px">{{selectArr.length}}</span>)
            </div>
            <div style="margin: 5px 0; text-align: center;text-overflow: ellipsis;overflow: hidden;white-space: nowrap;">
                (<span style="color: #de6f21;font-size: 14px">{{selectArr.length +'/'+ selectArray.length}}</span>)
            </div>
        </div>
        <ul class="tempPopup" v-if="isInTemp" ref="tempPopup" v-show="isShowTempPopup">
            <li v-for="(item, index) in options" :key="index" @click="handleChangeBeatType(item)"
                :class="{'popupDisabled': selectArr.length> 1&& item.type !== 'SELF'}">{{item.label}}
            </li>
        </ul>
        <ul class="tempPopup" ref="operatePopup" v-if="!isShowRight" v-show="isShowOperatePopup">
            <li @click="pageUp" :class="{'popupDisabled':pageObj.start === 0  || pageLoading}">上一页</li>
            <li @click="pageDown" :class="{'popupDisabled':(pageObj.total <= pageObj.start + pageObj.limit) || pageLoading}">下一页</li>
            <li @click="pageSelectAll" :class="{'popupDisabled':showArr.length === 0 || pageLoading}">页全选</li>
            <li @click="pageReverseSelect" :class="{'popupDisabled':showArr.length === 0 || pageLoading}">页反选</li>
            <li @click="selectAll" :class="{'popupDisabled':showArr.length === 0 || pageLoading}">全选</li>
            <li @click="reverseSelect" :class="{'popupDisabled':showArr.length === 0 || pageLoading}">反选</li>
            <li @click="showTempPopup($event, 1)" :class="{'popupDisabled':selectArr.length === 0 || pageLoading}">操作心搏</li>
        </ul>
    </div>
</template>
<script type="text/ecmascript-6">
    import Util from '../../common/util';
    import API from '../../api/api_block_view';
    import axios from 'axios';
    import {mapState, mapMutations, mapActions} from 'vuex';

    export default {
        name: 'ecgFragments',
        props: {
            isResetPage: { // 控制当前selectArray变化是否是因为改变了心拍类型，若是，就不重置页数
                type: Boolean,
                default: true
            },
            isShowRight: {
                type: Boolean,
                default: true
            },
            isSelectFirstBeat: {
                type: Boolean,
                default: false
            },
            isInTemp: {
                type: Boolean,
                default: false
            },
            higlightRangeSeconds: {
                type: Number,
                default: -1
            },
            sourceData: { // 所有心电数据
                type: Array,
                default: function () {
                    return []
                }
            },
            wrapperSize: {
                type: Object,
                default: function () {
                    return {width: 1170, height: 528}
                }
            },
            size: {
                type: Object,
                default: function () {
                    return {x: 4, y: 6}
                }
            },
            selectTypeNormal: { // 判断当前被选中的心拍类型，若等于快捷键改变的类型则不改变心电片段的类型
                type: String,
                default: ''
            }
        },
        data() {
            return {
                isShowOperatePopup: false,
                selectArray: [],
                pageObj: {
                    limit: this.size.x * this.size.y,
                    start: 0,
                    total: 0
                },
                mouseStartP: 0, // 计算距离差 用于区分模板列表的点击事件和拖拽事件
                mouseEndP: 0,
                isShowTempPopup: false,
                eventFlag: false, // 控制按钮是否执行
                select: false,
                showArr: [],
                ctrlKeyChecked: false,
                showEcgChecked: true,
                options: [
                    {value: 'N', label: '正常N', type: 'SELF'},
                    {value: 'V', label: '室性V', type: 'SELF'},
                    {value: 'S', label: '房性S', type: 'SELF'},
                    {value: 'Q', label: '噪音Q', type: 'SELF'}
                ],
                selectBlock: { // 用于设置selectBlock的位置
                    startX: 0,
                    startY: 0
                },
                selectTypeValue: '', // 右边select选择的心拍类型
                selectArrLen: 0, // 当前选中的数据长度
                onCtrlButton: false,
                onShiftButton: false,
                onShiftStart: -1,
                hackResetSlide: true, // 是否显示进度条
                slideValue: 0, // 当前选中的分页
                selectArr: [], // 当前选中的singlePapper数据的index
                highLightBlockSlice: {
                    start: 60,
                    end: 80
                },
                showPosition: -1,
                fillColorMap: {  // N,V,S,Q的颜色值
                    N: Util.nTag, //#1dd307
                    V: Util.vTag,
                    S: Util.sTag,
                    Q: Util.qTag
                },
                pageLoading: false, // div的loading
                lastPos: 0
            }
        },
        created() {
            if (this.isInTemp) {
                this.options = [
                    {value: 'N', label: '正常N', type: 'SELF'},
                    {value: 'V', label: '室性V', type: 'SELF'},
                    {value: 'S', label: '房性S', type: 'SELF'},
                    {value: 'Q', label: '噪音Q', type: 'SELF'},
                    {value: 'N', label: '按形态学归类N', type: 'SIMILAR'},
                    {value: 'V', label: '按形态学归类V', type: 'SIMILAR'},
                    {value: 'S', label: '按形态学归类S', type: 'SIMILAR'},
                    {value: 'Q', label: '按形态学归类Q', type: 'SIMILAR'},
                    {value: 'V', label: '按提前量归类V', type: 'ADVANCE'},
                    {value: 'S', label: '按提前量归类S', type: 'ADVANCE'}
                ]
            }
        },
        mounted() {
            if (this.higlightRangeSeconds === -1) {
                this.highLightBlockSlice.start = parseInt(this.canvasWidth * 3 / 7, 10)
                this.highLightBlockSlice.end = parseInt(this.canvasWidth * 4 / 7, 10)
            } else {
                this.highLightBlockSlice.start = parseInt(this.canvasWidth * ((2 - this.higlightRangeSeconds) / 4), 10)
                this.highLightBlockSlice.end = parseInt(this.canvasWidth * ((2 - this.higlightRangeSeconds) / 2 + this.higlightRangeSeconds) / 2, 10)
            }
        },
        activated() {
            this.bindEvent()
            this.bindDocumentEvents()
        },
        deactivated() {
            $(document).off('contextmenu')
            $(document).off('keydown', this.documentKeyDown);
            $(document).off('keyup', this.documentKeyUp);
            $(this.$refs['flexPaper']).off()
        },
        watch: {
            selectArr: function (newValue, oldValue) {
                if (!this.eventFlag && this.selectArr.length !== 0) {
                    this.$emit('handleUntyingEvent')
                    this.eventFlag = true
                }
                this.initCanvasScatter();
            },
            sourceData() {
//                this.selectArray = Util.deepCopy(this.sourceData).sort((a, b) => a - b);
                this.selectArray = this.sourceData;
                this.showArr = [];
                if (this.isSelectFirstBeat && this.selectArray.length !== 0 && this.isResetPage) {
                    this.selectArr = [0];
                    this.showPosition = this.selectArray[0]
                } else {
                    this.showPosition = -2
                    this.selectArr = [];
                }
                if (this.isResetPage) {
                    this.handleResetPageObj()
                } else {
                    if (this.pageObj.start > this.sourceData.length) {
                        this.pageObj.start = this.sourceData.length - this.pageObj.limit
                    }
                }
                this.init();
            },
            showPosition:{
                handler() {
                    this.$emit('handleSelectFragment', {
                        showPosition: this.showPosition
                    })
                }
            }
        },
        computed: {
            ...mapState('ecgView', {
                wholeViewLoading: state => state.wholeViewLoading,
                perDateData: state => state.perDateData,
                tagChangeState: state => state.tagChangeState,
                currentDate: state => state.currentDate,
                ecgLoader: state => state.ecgLoader
            }),
            canvasWidth() {
                return parseInt(this.wrapperSize.width / this.size.x - 8)
            },
            canvasHeight() {
                return parseInt(this.wrapperSize.height / this.size.y - 8)
            }
        },
        methods: {
            ...mapActions('ecgView', [
                'changeVSTagData'
            ]),
            ...mapMutations('ecgView', [
                'changePerDayData',
                'changeViewLoadingState',
                'changeTagState'
            ]),
            hidePopup() {
                if (this.isShowTempPopup) this.isShowTempPopup = false
                if (this.isShowOperatePopup) this.isShowOperatePopup = false
            },
            bindEvent() {
                let that = this;
                const scrollFun = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    /**
                     * 防抖处理
                     * @type {null}
                     */
                    clearTimeout(timeoutTime);
                    timeoutTime = setTimeout(() => {
                        if (that.selectArray.length) {
                            if (!that.pageLoading) {
                                let scrollWay = e.deltaY || e.detail;
                                if (scrollWay > 0) {
                                    if (that.pageObj.total > that.pageObj.start + that.pageObj.limit) {
                                        that.pageDown();
                                    }
                                } else {
                                    if (that.pageObj.start !== 0) {
                                        that.pageUp();
                                    }
                                }
                            }
                        }
                    }, 300);
                };
//          paperBlock

                let timeoutTime = null;
                that.$refs['flexPaper'].addEventListener('DOMMouseScroll', scrollFun);
                that.$refs['flexPaper'].addEventListener('mousewheel', scrollFun);
                $(document).on('contextmenu', (e)=> {
                    return false
                })
                $(that.$refs['flexPaper']).on('mousedown', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    that.hidePopup()
                    if (that.isInTemp) {
                        that.mouseStartP = {x: e.pageX, y: e.pageY}
                    }
                    if (!that.select) {
                        that.select = true;
                        that.selectBlock.startX = e.pageX - $(that.$refs['flexPaper']).offset().left;
                        that.selectBlock.startY = e.pageY - $(that.$refs['flexPaper']).offset().top;
                        $(that.$refs['selectBlock']).css({
                            display: 'block',
                            left: that.selectBlock.startX,
                            top: that.selectBlock.startY
                        });
                    } else {
                        that.select = false;
                        that.isOverlap();
                    }
                });
                $(that.$refs['flexPaper']).on('mouseup', function (e) {
                    e.preventDefault();
                    that.select = false;
                    if (that.isInTemp || that.isShowRight) {
                        that.mouseEndP = {x: e.pageX, y: e.pageY}
                        if (Math.abs(that.mouseEndP.x - that.mouseStartP.x) <= 8 && Math.abs(that.mouseEndP.y - that.mouseStartP.y) <= 8) {
                            if (e.button === 0) {
                                that.hidePopup()
                                that.isOverlap();
                            }else if (e.button === 2) {
                                if (that.isShowRight) {
                                    that.showTempPopup(e)
                                } else {
                                    that.showOperatePopup(e)
                                }
                            }
                        } else {
                            that.showTempPopup(e)
                            that.isOverlap();
                        }
                    } else {
                        that.isOverlap();
                    }
                });
                $(that.$refs['ecg-fragments-wrapper']).on('contextmenu', function () {
                    return false
                });
                $(that.$refs['flexPaper']).on('mouseleave', function () {
                    that.select = false;
//                that.isOverlap();
                });
                $(that.$refs['flexPaper']).on('mousemove', function (e) {
                    if (that.select) {
                        let width = e.pageX - $(that.$refs['flexPaper']).offset().left - that.selectBlock.startX;
                        let height = e.pageY - $(that.$refs['flexPaper']).offset().top - that.selectBlock.startY;
                        if (width >= 0) {
                            if (height >= 0) {
                                $(that.$refs['selectBlock']).css({
                                    width: Math.abs(width),
                                    height: Math.abs(height)
                                });
                            } else {
                                $(that.$refs['selectBlock']).css({
                                    width: Math.abs(width),
                                    height: Math.abs(height),
                                    left: e.pageX - $(that.$refs['flexPaper']).offset().left - Math.abs(width),
                                    top: e.pageY - $(that.$refs['flexPaper']).offset().top
                                });
                            }

                        } else {
                            if (height >= 0) {
                                $(that.$refs['selectBlock']).css({
                                    width: Math.abs(width),
                                    height: Math.abs(height),
                                    left: e.pageX - $(that.$refs['flexPaper']).offset().left,
                                    top: e.pageY - $(that.$refs['flexPaper']).offset().top - Math.abs(height)
                                });
                            } else {
                                $(that.$refs['selectBlock']).css({
                                    width: Math.abs(width),
                                    height: Math.abs(height),
                                    left: e.pageX - $(that.$refs['flexPaper']).offset().left,
                                    top: e.pageY - $(that.$refs['flexPaper']).offset().top
                                });
                            }
                        }
                    } else {
                        $(that.$refs['selectBlock']).css({
                            display: 'none',
                            width: 0,
                            height: 0
                        });
                    }
                });
            },
            // 在右边下拉框中修改心拍类型
            handleChangeSelect(val) {
                let selectData = this.options[val]
                this.changeSelect(selectData.value, selectData.type)
            },
            // 在popup中修改心拍类型
            handleChangeBeatType(item) {
                if (item.value !== this.selectTypeNormal) {
                    if (this.selectArr.length > 1 && item.type !== 'SELF') {
                        return
//                        this.$message({
//                            message: '模板修改只允许选择一个心拍类型',
//                            type: 'warning'
//                        });
                    } else {
                        this.hidePopup()
                        this.changeSelect(item.value, item.type)
                    }
                }
            },

            showOperatePopup(e) {
                if (this.selectArr.length === 0) return;
                let left = e.pageX - $(this.$refs['flexPaper']).offset().left
                if (e.pageX - $(this.$refs['flexPaper']).offset().left + 175 > $(this.$refs['flexPaper']).width()) {
                    left = e.pageX - $(this.$refs['flexPaper']).offset().left - 175
                }
                $(this.$refs['operatePopup']).css({
                    left: left + 5,
                    top: e.pageY - $(this.$refs['flexPaper']).offset().top
                })
                this.isShowOperatePopup = true
            },
            showTempPopup(e, flag) {
                if (this.selectArr.length === 0) return;
                if (this.isShowTempPopup) {
                    this.isShowTempPopup = false
                    return;
                }
                let left = 0
                if (flag) {
                    left = $(this.$refs['operatePopup']).offset().left + $(this.$refs['operatePopup']).width() - $(this.$refs['flexPaper']).offset().left + 2
                } else {
                    left = e.pageX - $(this.$refs['flexPaper']).offset().left
                }
                if (e.pageX - $(this.$refs['flexPaper']).offset().left + 175 > $(this.$refs['flexPaper']).width()) {
                    left = e.pageX - $(this.$refs['flexPaper']).offset().left - 175
                }
                $(this.$refs['tempPopup']).css({
                    left: left,
                    top: e.pageY - $(this.$refs['flexPaper']).offset().top
                })
                this.isShowTempPopup = true
            },
            changeCtrlState() {
                this.onCtrlButton = this.ctrlKeyChecked;
            },
            init() {
                this.getSelectPointEcg();
            },
            clearSelectArr() {
                this.selectArr = [];
                $(this.$refs['singlePaper']).removeClass('selectBorder');
            },
            handleLoadingShow() {
                if (!this.wholeViewLoading) {
                    this.pageLoading = true;
                }
            },
            formate(date) {
                let date1 = date.split(' ');
                date1[0].replace(/\//g, '-');
                return date1[0].replace(/\//g, '-');
            },
            // 关闭当前组件对1，2，3，4键的占用
            closeEvent() {
                this.eventFlag = false
            },
            changeShowArr(val) {
                let release = val % (this.size.x * this.size.y);
                this.pageObj = {
                    ...this.pageObj,
                    start: val - release
                };
                this.getSelectPointEcg();
            },
            initCanvasScatter() {
                let c_canvas = this.$refs['myCavansScatter'];
                if (c_canvas === null) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                let width = c_canvas.width;
                let height = c_canvas.height;
                context.clearRect(0, 0, width, height);
                let per = 1 / this.pageObj.total * width;
                context.fillStyle = 'rgba(255,0,0,.5)';
                let endWidth = per;
                this.selectArr.map((item, index) => {
                    let x = item / this.pageObj.total * width;
                    context.fillRect(x, 0, endWidth, 6);
                });
            },
            // 页全选
            pageSelectAll() {
                let tempSelect = [];
                if (!this.onCtrlButton) this.selectArr = [];
                for (let i = 0; i < this.showArr.length; i++) {
                    if (this.selectArr.indexOf(this.pageObj.start + i) === -1) {
                        tempSelect.push(this.pageObj.start + i);
                    }
                }
                this.selectArr = this.selectArr.concat(tempSelect);
                this.showPosition = this.showArr[this.showArr.length - 1].pos;
                $(this.$refs['singlePaper']).addClass('selectBorder');
                this.hidePopup()
            },
            // 页反选
            pageReverseSelect() {
                let tempSelect = [];
                for (let i = 0; i < this.showArr.length; i++) {
                    let index = this.selectArr.indexOf(this.pageObj.start + i)
                    if (index === -1) {
                        tempSelect.push(this.pageObj.start + i);
                    } else {
                        if (this.selectArr[index] >= this.pageObj.start) {
                            this.selectArr.splice(index, 1)
                        }
                    }
                }
                if (!this.onCtrlButton) {
                    this.selectArr = tempSelect;
                } else {
                    this.selectArr = this.selectArr.concat(tempSelect);
                }
                if (this.selectArr.length) {
                    this.showPosition = this.showArr[this.showArr.length - 1].pos;
                } else {
                    this.showPosition = -1;
                }
                this.drawSelectBorder();
                this.hidePopup()
            },
            /**
             * 全选
             */
            selectAll() {
                this.selectArr = [...''.padEnd(this.selectArray.length)].map((i, d) => d);
                this.showPosition = this.selectArray[this.selectArray.length - 1];
                $(this.$refs['singlePaper']).addClass('selectBorder');
                this.hidePopup()
            },
            /**
             * 反选
             */
            reverseSelect() {
                let tempSelect = [];
                let temp = {};
                this.selectArr.map((i, d) => {
                    temp[this.selectArr[d]] = true;
                });
                for (let i = 0; i < this.selectArray.length; i++) {
                    if (!temp[i]) {
                        tempSelect.push(i);
                    }
                }
                this.selectArr = tempSelect;
                if (tempSelect.length) {
                    this.showPosition = this.selectArray[this.selectArr[this.selectArr.length - 1]];
                } else {
                    this.showPosition = -1;
                }
                this.drawSelectBorder();
                this.hidePopup()
            },
            /**
             * 修改页面布局，既一页显示多少个心电片段
             * @param val
             */
            changeCheckState(val) {
                let start = this.pageObj.start;
                if (!val) {
                    this.pageObj = {
                        ...this.pageObj,
                        start: parseInt(start / (this.size.x * (this.size.y + 1))) * (this.size.x * (this.size.y + 1)),
                        limit: (this.size.x * (this.size.y + 1))
                    };
                    this.getSelectPointEcg();
                } else {
                    this.pageObj = {
                        ...this.pageObj,
                        start: parseInt(start / (this.size.x * this.size.y)) * (this.size.x * this.size.y),
                        limit: (this.size.x * this.size.y)
                    };
                    this.getSelectPointEcg();
                }
                this.$emit('handleChangeSize', val)
            },
            /**
             * 上一页
             */
            pageUp() {
                if (this.pageObj.start <= 0) {
                    this.pageObj.start = 0;
                } else {
                    this.pageObj.start -= this.pageObj.limit;
                }
                this.hidePopup()
                this.getSelectPointEcg(false);
            },
            /**
             * 下一页
             */
            pageDown() {
                if (this.pageObj.start + this.pageObj.limit < this.pageObj.total) {
                    this.pageObj.start += this.pageObj.limit;
                }
                this.hidePopup()
                this.getSelectPointEcg(false);
            },
            /**
             *  心电片段模块代码
             */
            /**
             *  1、 isOverLap 是否在框选区域
             *  用于在心电片段用鼠标框选，判断鼠标框选区域和singlePaper Div是否有重叠，有重叠则被选中
             */
            isOverlap() {
                if (!this.onCtrlButton && !this.onShiftButton) {
                    this.selectArr = [];
                }
                let aim = $(this.$refs['selectBlock']);
                let offsetAim = aim.offset();
                let topAim = offsetAim.top;
                let leftAim = offsetAim.left;
                let widthAim = aim.width();
                let heightAim = aim.height();
                for (let i = 0, len = $(this.$refs['singlePaper']).length; i < len; i++) {
                    let obj = $(this.$refs['singlePaper']).eq(i);
                    let offsetObj = obj.offset();
                    let topObj = offsetObj.top;
                    let leftObj = offsetObj.left;
                    let widthObj = obj.width();
                    let heightObj = obj.height();
                    let isOverlap = true;
                    if (leftAim > leftObj + widthObj) {
                        isOverlap = false;
                    }
                    if (leftAim + widthAim < leftObj) {
                        isOverlap = false;
                    }
                    if (topAim >= topObj + heightObj) {
                        isOverlap = false;
                    }
                    if (topAim + heightAim < topObj) {
                        isOverlap = false;
                    }
                    if (isOverlap) {
                        if (!this.onShiftButton) {
                            this.onShiftStart = i + this.pageObj.start;
                        }
                        if (this.onCtrlButton) {
                            this.addArr(i);
                        } else if (this.onShiftButton) {
                            if (this.selectArr.length === 0) {
                                this.addArr(i);
                            } else {
                                this.selectArr = [];
                                let endIndex = i + this.pageObj.start;
                                let startIndex = this.onShiftStart;
                                if (startIndex > endIndex) {
                                    let temp = startIndex;
                                    startIndex = endIndex;
                                    endIndex = temp;
                                }
                                for (let i = startIndex; i <= endIndex; i++) {
                                    this.addArr(i);
                                }
                            }
                        } else {
                            this.addArr(i);
                        }
                    }
                }
                this.drawSelectBorder();
                $(this.$refs['selectBlock']).css({
                    display: 'none',
                    width: 0,
                    height: 0
                });
            },
            clearShowPosition() {
                this.showPosition = -2;
            },
            addArr(index) {
                if (!this.onShiftButton) {
                    index = index + this.pageObj.start;
                }
                let selectIndex = this.selectArr.indexOf(index);
                if (selectIndex === -1) {
                    this.selectArr.push(index);
                    this.selectArr.sort((a, b) => a - b);
                    if (this.showArr[index - this.pageObj.start]) {
                        this.showPosition = this.showArr[index - this.pageObj.start].pos;
                    }
                } else if (this.onShiftButton) {
                    this.selectArr.push(index);
                    this.selectArr.sort((a, b) => a - b);
                    let lastIndex = this.selectArr[this.selectArr.length - 1];
                    if (this.showArr[index - this.pageObj.start]) {
                        this.showPosition = this.showArr[index - this.pageObj.start].pos;
                    }
                } else {
                    this.selectArr.splice(selectIndex, 1);
                    let lastIndex = this.selectArr[this.selectArr.length - 1];
                    if (lastIndex >= this.pageObj.limit + this.pageObj.start) {
                        lastIndex = index;
                    }
                    if (this.selectArr.length > 0) {
                        if (this.showArr[index - this.pageObj.start]) {
                            this.showPosition = this.showArr[index - this.pageObj.start].pos;
                        }
                    } else {
                        this.showPosition = -5120
                    }
                }
            },
            editBeatType(type, positions, updateMode) {
                let reportId = localStorage.getItem('report_id'); //报告id
                let sendArr = [];  //并发ajax请求储存数组
                let param = {beatType: type, positions: positions}
                if (this.isInTemp) {
                    param = {isInecgs: true, param: param, returnSuccessBeatPositions: false, updateMode: updateMode}
                    this.changeViewLoadingState(true)
                }
                // this.changeViewLoadingState(true)
                this.$emit('resetTenEcg')
                sendArr.push(API.changeBeatType(param, reportId));
                axios.all(sendArr)
                    .then(axios.spread((data) => {
                        setTimeout(() => {
//                            debugger;
                            let releaseNums = 0;
                            for (let i = 0; i < this.selectArr.length; i++) {
                                if (this.selectArr[i] < this.pageObj.start) {
                                    releaseNums++;
                                }
                            }
                            let reduceNum = Math.ceil(releaseNums / this.pageObj.limit) * this.pageObj.limit;
                            this.pageObj = {
                                ...this.pageObj,
                                start: this.pageObj.start - reduceNum
                            };
                            this.$emit('handleChangePageState', {key: 'ecgs'})
                            // this.showPosition = -5120;
                        }, 0);
                    })).catch(() => {
                    this.changeViewLoadingState(false)
                });
            },
            _binarySearch(index, data) {
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = Math.floor((l + r) / 2);
                    let currentP = data[mid].p;
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
            binarySearch(positions, type) {
                let currentDate = this.formate(this.currentDate)
                let data = this.perDateData[currentDate]['tag'][`${this.selectTypeNormal.toLowerCase()}TagData`];
                let arr = this.flatArray(Object.assign(data)).sort((a, b) => a.p - b.p);
                let tempData = Object.assign(this.perDateData[currentDate]['data']);
                positions.map(item => {
                    let index = arr[this._binarySearch(item, arr)].i;
                    let tempDataItem = tempData[index];
                    if (tempDataItem.t !== type) {
                        tempDataItem.t = type;
                        tempDataItem.m = -1;
                        tempData[index] = JSON.stringify(tempDataItem);
                    }
                });
                this.changePerDayData({
                    date: currentDate,
                    tagData: tempData,
                    tag: {},
                    changed: true
                });
                this.changeVSTagData(currentDate);
            },
            flatArray(arr) {
                if (arr === undefined) return [];
                return arr.reduce((pre, cur) => {
                    return pre.concat(cur);
                }, []);
            },
            changeSelect(val, updateMode) {
                if (this.eventFlag) {
                    if (this.selectArr.length === 0) return;
                    if (this.selectTypeNormal === val) return;
                    let temp = [];
                    // this.changeViewLoadingState(true);
                    this.selectArr.map(item => {
                        temp.push(this.selectArray[item]);
                    });
                    this.selectArrLen = this.selectArr.length;
                    this.editBeatType(val, temp, updateMode);
                    this.selectTypeValue = '';
                }
            },
            onButtonClick(keyCode, onShift) {
                const actions = new Map([
                    ['default', () => false],
                    ['49', () => this.changeSelect('N', 'SELF')],
                    ['50', () => this.changeSelect('V', 'SELF')],
                    ['51', () => this.changeSelect('S', 'SELF')],
                    ['52', () => this.changeSelect('Q', 'SELF')],
                    ['97', () => this.changeSelect('N', 'SELF')],
                    ['98', () => this.changeSelect('V', 'SELF')],
                    ['99', () => this.changeSelect('S', 'SELF')],
                    ['100', () => this.changeSelect('Q', 'SELF')]
                ]);
                let tempKeyCode = keyCode.toString();
                let action = null;
                action = actions.get(tempKeyCode) || actions.get('default');
                action.call(this);
            },
            documentKeyDown(e) {
                let that = this
                if (!that.ctrlKeyChecked) {
                    that.onCtrlButton = e.ctrlKey;
                    that.onShiftButton = e.shiftKey;
                }
                let keyCode = e.keyCode;
                this.onButtonClick(keyCode);
                if (e.shiftKey) {
                    if (that.selectArr.length) {
                        if (that.onShiftStart === -1) {
                            that.onShiftStart = that.selectArr[0];
                        }
                    } else {
                        that.onShiftStart = -1;
//                        that.$message('请先选择起始卡片')
                    }
                }
            },
            documentKeyUp() {
                let that = this
                if (!that.ctrlKeyChecked) {
                    that.onCtrlButton = false;
                    that.onShiftButton = false
                }
            },
            bindDocumentEvents() {
                $(document).on('keydown', this.documentKeyDown);
                $(document).on('keyup', this.documentKeyUp);
            },
            /**
             * 绘制ecgCanvas图形
             * @param context
             * @param data
             * @param position
             * @param type
             * @param x_pos
             * @param x_end_pos
             * @param y_start_pos
             * @param frequency
             * @param add
             * @param y_height
             */
            drawEcgPart(context, data, position, type, x_pos = 0, x_end_pos = this.canvasWidth, y_start_pos = 0, frequency = 128 * 2, add = 10, y_height = this.canvasHeight) {
                context.lineWidth = 1;
                context.beginPath();
                let length = data.length;
                context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);
                let color = this.fillColorMap[type] || '#030304';
                if (type === 'N') {
                    color = '#312bff'
                }
                for (let i = 0; i < length; i++) {
                    let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                    let yPosition = (-data[i] * add * 5) * 4 + y_height / 2;
                    if (xPosition >= this.highLightBlockSlice.start && xPosition <= this.highLightBlockSlice.end) {
                        if (context.strokeStyle !== color) {
                            context.stroke();
                            context.beginPath();
                            context.strokeStyle = color;
                        }
                    } else {
                        if (context.strokeStyle !== '#030304') {
                            context.stroke();
                            context.beginPath();
                            context.strokeStyle = '#030304';
                        }
                    }
                    context.lineTo(xPosition, yPosition);
                }
                context.stroke();
                return;
            },
            /**
             * 获取选中区域Ecg心电数据并绘制图形
             * @param changeBeat  是否变换的类型和初始类型不一样，不一样则要对页码进行操作
             * @param redraw  是否需要对页码进行操作
             */
            getSelectPointEcg(changeBeat = true, redraw = false) {
                if (this.selectArray.length) {
                    if (redraw) {
                        if (changeBeat) {
                            if (this.pageObj.start !== 0) {
                                if (this.pageObj.start >= this.pageObj.total - this.selectArrLen) {
                                    this.pageObj.start -= this.pageObj.limit;
                                }
                            }
                        }
                    }
                    if (!this.wholeViewLoading) {
                        this.pageLoading = true;
                    }
                    let slicePositions = this.selectArray.slice(this.pageObj.start, this.pageObj.start + this.pageObj.limit) || [];
                    let posTypes = [];

                    let date = this.currentDate.split(' ')[0].split('/').join('-');
                    let type = this.selectTypeNormal || 'All';
                    let currentFlatData = Util.flatArray(this.perDateData[date]['tag'][`${type.toLowerCase()}TagData`]).sort((a, b) => a.p - b.p);
                    slicePositions.map(item => {
                        posTypes.push(this._binarySearch(item, currentFlatData));
                    });

                    this.ecgLoader.getSlices(slicePositions, 512, 512,(slices)=>{
                        this.pageLoading = false;
                        /**
                         *  当获取数据的长度为0时 需要将页码返回上一页，并重新获取数据
                         */
                        if (slices.length === 0) {
                            this.getSelectPointEcg(true, true);
                            return;
                        }
                        this.pageObj.total = this.selectArray.length;
                        this.slideValue = this.pageObj.start + slices.length;
                        this.showArr = slices;
                        this.$nextTick(() => {
                            this.showArr.map((item, index) => {
                                let showData = item.data;
                                let id = item.pos + 'scatter';
                                if (this.$refs[`${id}`] && this.$refs[`${id}`].length > 0) {
                                    let c_canvas = this.$refs[id][0];
                                    if (c_canvas) {
                                        let context = c_canvas.getContext("2d");
                                        context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                                        this.drawEcgPart(context, showData, item.pos, currentFlatData[posTypes[index]].t);
                                    }
                                }
                            });
                            this.$nextTick(() => {
                                this.drawSelectBorder();
                            });
                        });
                        this.changeViewLoadingState(false)
                    });
                } else {
                    this.pageObj.start = 0;
                    this.pageObj.total = 0;
                    this.slideValue = 0
                    this.hackResetSlide = false
                    this.showPosition = -1;
                    this.$nextTick(() => {
                        this.hackResetSlide = true
                    })
                    this.pageLoading = false;
                    this.changeViewLoadingState(false)
                }
            },
            handleResetPageObj() {
                this.pageObj.start = 0;
                this.pageObj.total = 0;
                this.hackResetSlide = false
                this.slideValue = 0
                this.$nextTick(() => {
                    this.hackResetSlide = true
                })
            },
            /**
             * 将选中的图形框置红，其中selectArr为所有页的心电数据的选中集合
             */
            drawSelectBorder() {
                $(this.$refs['singlePaper']).removeClass('selectBorder');
                this.selectArr.map(item => {
                    let itemPos = $(this.$refs['singlePaper']).eq(item - this.pageObj.start).attr('data-pos');
                    let index = item - this.pageObj.start;
                    if (index >= 0 && index < this.pageObj.limit) {
                        if (this.showArr[item - this.pageObj.start]) {
                            if (Number(itemPos) === this.showArr[item - this.pageObj.start].pos) {
                                $(this.$refs['singlePaper']).eq(item - this.pageObj.start).addClass('selectBorder');
                            }
                        }
                    }
                });
            },
            noDefault(e) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
</script>
<style type="text/css" scoped lang="scss">
    .popupDisabled {
        color: #C0C4CC;
        cursor: not-allowed !important;
    }

    .tempPopup {
        position: absolute;
        top: 0;
        background: #ffffff;
        list-style: none;
        z-index: 10000;
        box-shadow: 3px 3px rgba(123, 123, 123, 0.43);
        width: 175px;
        border: 1px solid #C0C4CC;
        left: 0;

        li {
            text-align: center;
            line-height: 30px;
            cursor: pointer;
            /*padding-left: 10px;*/
            /*border-bottom: 1px solid #7b7b7b;*/
            font-size: 14px;
        }

        & > li:last-child {
            border-bottom: none;
        }
    }

    .ecg-fragments-wrapper /deep/ .el-slider__button-wrapper {
        display: none;
    }

    .ecg-fragments-wrapper /deep/ .el-slider__runway {
        margin: 2px 0;
    }

    .ecg-fragments-wrapper {
        position: relative;
    }

    .slideWrapper {
        position: absolute;
        top: 0px;
        pointer-events: none;
        border-radius: 2px;
        height: 6px;
        z-index: 1002;
        margin: 2px 0;

        canvas {
            position: absolute;
            top: 0;
            left: 0;
        }

    }

    .buttonBox {
        position: absolute;
        right: -107px;
        width: 100px;
        top: 0;
    }

    .singlePaperItem {
        position: relative;
        /*z-index: 1;*/
        float: left;
        border: 1px solid #7b7b7b;
        margin: 3px;
    }

    .flexPaperBoxItem {
        position: relative;
        overflow: hidden;
        justify-content: space-around;
        border-radius: 4px;
        box-shadow: 0 1px 1px 1px rgba(0, 0, 0, .4);
        background-color: #fffdfd
    }

    .selectBlockItem {
        position: absolute;
        display: none;
        width: 0;
        height: 0;
        left: 0;
        top: 0;
        border: 1px solid #ccc;
        z-index: 99;
        background-color: rgba(45, 245, 255, 0.2);
    }

    .selectBorder {
        border-color: #ff0a18;
        box-shadow: 0 0 1px 0 rgba(255, 10, 24, 0.4);
    }
</style>