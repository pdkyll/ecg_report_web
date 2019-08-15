<template>
    <div class="overlay-view">
        <noMessage v-if="showEmpty"></noMessage>
        <div class="overlay-view-header" v-if="!showEmpty">
            <div style="position: absolute; right: 0; top:  -46px;" v-if="!showEmpty">
                <SelectTypeAside
                        :hasSelect="false"
                        :defaultIndex="0"
                        @changeSelectType="beatTypeSelect"
                />
            </div>
        </div>
        <div class="overlay-view-content" v-if="!showEmpty">
            <div class="overlay-view-content-left">
                <OverlayMain :slotBeatCounts="slotBeatCounts" @selectOverlayArea="selectOverlayArea"
                             @slotChange="slotChange"
                             @overlaySlot0Loaded="overlaySlot0Loaded"
                             ref="overlayMain"></OverlayMain>
            </div>
            <div style="flex-grow: 1">
                <RRIScatter :data="rriData" :xStartTime="currentDate" :symbolColor="symbolColor"
                            :resetRRIHandle="resetRRIHandle"
                            :width="1260"
                            @selectTime="rriSelectTimeChange" @selectTimeRange="rriSelectTimeRangeChange"
                            ref="RRIScatter">

                </RRIScatter>
                <ecg-fragments
                        ref="ecgFragments"
                        :isSelectFirstBeat="true"
                        :isResetPage="Boolean(changeFlag)"
                        :sourceData="currentSlotBeats"
                        :pageIndex="2"
                        :size="{x: 7, y: 5}"
                        :wrapperSize="{width:1130, height: 440}"
                        selectTypeNormal="All"
                        @resetTenEcg="resetTenEcg"
                        @handleUntyingEvent="handleUntyingEvent"
                        @handleChangeSize="handleChangeSize"
                        @handleSelectFragment="handleSelectFragment"
                        @handleChangePageState="handleChangePageState"
                ></ecg-fragments>
            </div>
        </div>
        <div v-show="isShowBottom" v-if="!showEmpty" style="position: relative">
            <el-button type="primary" style="position: absolute; right: 25px; top: 162px;z-index: 999"
                       @click="goToMain">跳转到原图
            </el-button>
            <slider @changePosition="changePosition" ref="slider" :width="1550"></slider>
            <FewSecondsEcg
                    ref="tenSecond"
                    :isClearState="isClearState"
                    :ecgPosition="tenSecondPosition"
                    @tagsChange="tagsChange"
                    @ecgChange="ecgChange"
                    @hasOperate="hasOperate"
                    @beatChange="beatChange"
            />
            <HalfMinuteEcg :currentPosition="halfMinutePosition" ref="halfMinuteEcg"
                           @curentActiveRange="curentActiveRange"
            ></HalfMinuteEcg>
        </div>
    </div>
</template>
<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import EcgFragments from '../components/common/EcgFragments.vue';
    import RRIScatter from '../components/common/RRIScatter.vue';
    import FewSecondsEcg from '../components/common/FewSecondsEcg';
    import OverlayMain from '../components/overlayView/OverlayMain.vue';
    import HalfMinuteEcg from '../components/common/HalfMinuteEcg.vue'
    import SelectTypeAside from '../components/commonBlock/SelectTypeAside';
    import Util from '../common/util';
    import commonInitMixin from '../assets/mixin/commonInit';
    import {bus} from '../bus';
    import APIEcgView from '../api/api_ecg_view';
    import API from '../api/api_overlay';
    import axios from 'axios';
    import Slider from '../components/common/Slider.vue';
    import noMessage from '../components/common/noMessage';
    import {QrsRenderer} from '../common/qrs_renderer';

    export default {
        name: 'OverlayView',
        mixins: [commonInitMixin],
        components: {
            FewSecondsEcg,
            SelectTypeAside,
            RRIScatter,
            EcgFragments,
            HalfMinuteEcg,
            Slider,
            OverlayMain,
            noMessage
        },
        data() {
            return {
                componentName: 'overlay',
                tagStateIndex: 4,
                rriData: [],
                symbolColorMap: {
                    N: Util.nTag,
                    V: Util.vTag,
                    S: Util.sTag,
                    Q: Util.qTag
                },
                symbolColor: Util.nTag,
                rriSelectTimeRange: {
                    start: '',
                    end: ''
                },
                resetRRIHandle: true,
                overlayDragArea: null,//{left,right,top,bottom}
                moveOverlayKeyCodeMap: {
                    '48': 0,
                    '96': 0,
                    '49': 1,
                    '97': 1,
                    '50': 2,
                    '98': 2,
                    '51': 3,
                    '99': 3,
                    '52': 4,
                    '100': 4,
                },
                currentActiveSlot: 0,
                slotBeatCounts: new Array(5).fill(0),
                currentSlotBeats: [],
                selectType: 'N',
                slotBeats: new Array(5).fill([]),
                qrsRenders: new Array(5).fill(null),
                firstMount:true,
                firstMountBeats:[]
            }
        },
        computed: {
            ...mapState('ecgView', {
                wholeViewLoading: state => state.wholeViewLoading,
                ecgStartTime: state => state.ecgStartTime,
                ecgEndTime: state => state.ecgEndTime
            }),
            report_id() {
                return localStorage.getItem('report_id');
            }
        },
        watch: {
            showData() {
                // this.resetRRIHandle = this.changeFlag === 1;
                this.rriData = this.createRRIData(this.showData, this.selectType);
                if (this.changeFlag === 1) {
                    this.rriSelectTimeRange = {
                        start: '',
                        end: ''
                    };
                    this.initOverlay(this.selectType);
                } else {
                    this.$refs.ecgFragments.clearSelectArr();
                    setTimeout(() => {
                        this.$refs.ecgFragments.getSelectPointEcg();
                    }, 0)
                }
            },
            currentDate() {
                if (this.selectComponent === this.componentName) {
                    this.changeFlag = 1;
                    this.showPosition = -1
                    this.$refs.tenSecond.clear()
                }
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeViewLoadingState',
            ]),
            // 解除迭加图对1,2,3,4键的绑定
            handleUntyingEvent() {
                this.overlayDragArea = null;
                this.$refs.overlayMain.resetDragArea();
            },
            beatChange() {
                this.changeFlag = 0
            },
            // 通知当前页面修改了
            handleChangePageState() {
                this.changeFlag = 0
            },
            createRRIData(currentDateTags, beatType) {
                let res = [];
                if (currentDateTags.length >= 2) {
                    for (let i = 0; i < currentDateTags.length; i++) {
                        let currentTag = null;
                        let preTag = null;
                        if (i === 0) {
                            currentTag = currentDateTags[i];
                            preTag = currentDateTags[i + 1];
                        } else {
                            currentTag = currentDateTags[i];
                            preTag = currentDateTags[i - 1];
                        }
                        if (currentTag.d !== 2 && currentTag.t === beatType) {
                            let rri = parseInt((currentTag.p - preTag.p) / 512 * 1000);
                            if (rri > 3000) {
                                rri = 3000;
                            }
                            let x = new Date(this.ecgStartTime).setSeconds(new Date(this.ecgStartTime).getSeconds() + currentTag.p / 512);
                            res.push([x, rri]);
                        }
                    }
                }
                return res
            },
            beatTypeSelect(item) {
                this.changeViewLoadingState(true)
                this.$refs.RRIScatter.changeRRILoading(true);
                this.symbolColor = this.symbolColorMap[item];
                this.changeFlag = 1
                this.selectType = item
                this.caclShowData();
            },
            rriSelectTimeChange({start, end}) {
                this.changeFlag = 1;
                this.initOverlay(this.selectType, start, end);
                this.rriSelectTimeRange = {start, end};
            },
            rriSelectTimeRangeChange(timeRange) {
                //避免鼠标单击后，鼠标keyup事件再次触发相同的请求
                if (this.rriSelectTimeRange.start === timeRange.start && this.rriSelectTimeRange.end === timeRange.end) {
                    return;
                }
                this.rriSelectTimeRange = {
                    start: timeRange.start,
                    end: timeRange.end
                };
                this.initOverlay(this.selectType, this.rriSelectTimeRange.start, this.rriSelectTimeRange.end);
            },
            selectOverlayArea(left, right, top, bottom) {
                if (this.overlayDragArea !== null) {
                    if (this.overlayDragArea.left === left && this.overlayDragArea.right === right
                        && this.overlayDragArea.top === top && this.overlayDragArea.bottom === bottom) {
                        return;
                    }
                }
                this.overlayDragArea = {left, right, top, bottom};
                this.$refs.ecgFragments.closeEvent();
                this.$refs.tenSecond.reset({keyCode: 27});
            },
            updateOverlay(beats, slotNum) {
                this.ecgLoader.getSlices(beats, this.samplingFrequency / 2, this.samplingFrequency / 2, (slices) => {
                    this.$refs.overlayMain.changeOverlayImgUrls(slotNum,
                        this.qrsRenders[slotNum].render(slices));
                });
            },
            moveOverlayDo(keyCode) {
                //当前窗口移动到当前窗口，则操作无效
                if (this.currentActiveSlot === this.moveOverlayKeyCodeMap[keyCode]) {
                    return;
                }
                if (this.overlayDragArea !== null) {
                    if (!this.wholeViewLoading) {
                        this.$refs.ecgFragments.handleLoadingShow();
                        this.$refs.overlayMain.changeOverlayImgLoading(this.currentActiveSlot, true);
                        this.$refs.overlayMain.changeOverlayImgLoading(this.moveOverlayKeyCodeMap[keyCode], true);
                    }
                    this.ecgLoader.getSlices(this.currentSlotBeats, this.samplingFrequency / 2, this.samplingFrequency / 2, (slices) => {
                        let selectedBeatsPos = this.qrsRenders[this.currentActiveSlot].select(slices,
                            this.overlayDragArea.left, this.overlayDragArea.right, this.overlayDragArea.top, this.overlayDragArea.bottom);
                        this.currentSlotBeats = this.currentSlotBeats.filter(v => {
                            return !selectedBeatsPos.includes(v);
                        });
                        //更新移动时候两个窗口的心拍数据
                        this.slotBeats[this.currentActiveSlot] = this.currentSlotBeats;
                        this.slotBeats[this.moveOverlayKeyCodeMap[keyCode]] = this.slotBeats[this.moveOverlayKeyCodeMap[keyCode]].concat(selectedBeatsPos).sort((a, b) => a - b);
                        this.slotBeatCounts.splice(this.currentActiveSlot, 1, this.slotBeats[this.currentActiveSlot].length);
                        this.slotBeatCounts.splice(this.moveOverlayKeyCodeMap[keyCode], 1, this.slotBeats[this.moveOverlayKeyCodeMap[keyCode]].length);
                        //更新两个窗口的叠加图
                        this.updateOverlay(this.slotBeats[this.currentActiveSlot], this.currentActiveSlot);
                        this.updateOverlay(this.slotBeats[this.moveOverlayKeyCodeMap[keyCode]], this.moveOverlayKeyCodeMap[keyCode]);
                        //清空叠加图拖拽区域
                        this.overlayDragArea = null;
                        this.$refs.overlayMain.resetDragArea();
                    });
                } else {
                    this.$refs.overlayMain.resetDragArea();
                }
            },
            moveOverlay(e) {
                switch (e.keyCode) {
                    case 48:
                    case 96:
                        this.moveOverlayDo(e.keyCode);
                        break;
                    case 49:
                    case 97:
                        this.moveOverlayDo(e.keyCode);
                        break;
                    case 50:
                    case 98:
                        this.moveOverlayDo(e.keyCode);
                        break;
                    case 51:
                    case 99:
                        this.moveOverlayDo(e.keyCode);
                        break;
                    case 52:
                    case 100:
                        this.moveOverlayDo(e.keyCode);
                        break;
                }
            },
            slotChange(slot) {
                this.changeFlag = 2; // 切换选中叠加图 1会重置叠加图 大于0会重置缩略图 所以此时取2不重置叠加图 重置缩略图
                this.currentActiveSlot = slot;
                this.currentSlotBeats = this.slotBeats[slot].sort((a, b) => a - b);
            },
            calcPosByTime(time) {
                return (new Date(time).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * this.samplingFrequency;
            },
            isEqualTwoArray(arr1, arr2) {
                if (arr1.length !== arr2.length) {
                    return false
                }
                for (let i = 0, len = arr1.length; i < len; i++) {
                    if (arr1[i] !== arr2[i]) {
                        return false
                    }
                }
                return true;
            },
            overlaySlot0Loaded(){
                if(this.firstMount){
                    this.currentSlotBeats=this.firstMountBeats;
                    this.firstMount=false;
                }
            },
            //初始化叠加图，会丢失其他小窗口的临时叠加图
            initOverlay(beatType = 'N', beginTime, endTime) {
                if (beginTime && endTime) {
                    let beginIndex = Util.findCurrentIndex(true, this.showData, this.calcPosByTime(beginTime)).index;
                    let endTemp = Util.findCurrentIndex(true, this.showData, this.calcPosByTime(endTime));
                    let endIndex = endTemp.state ? endTemp.index + 1 : endTemp.index;
                    let tempSlotBeats = this.showData.slice(beginIndex, endIndex).map(beat => {
                        return beat.p
                    });
                    if (this.isEqualTwoArray(this.currentSlotBeats, tempSlotBeats)) {
                        return;
                    }
                    this.currentSlotBeats = tempSlotBeats;
                } else {
                    let tempBeats = this.showData.map(beat => {
                        return beat.p
                    });
                    if (this.isEqualTwoArray(this.currentSlotBeats, tempBeats)) {
                        return;
                    }
                    if(this.firstMount){
                        this.firstMountBeats=tempBeats;
                    }else {
                        this.currentSlotBeats = tempBeats;
                    }
                }
                //重置一些与叠加图相关的状态
                this.currentActiveSlot = 0;
                this.selectType = beatType;
                this.slotBeatCounts = new Array(5).fill(0);
                this.$refs.overlayMain.reset();
                this.$refs.ecgFragments.handleLoadingShow();
                //心拍以及叠加图的赋值
                if(!this.wholeViewLoading){
                    this.$refs.overlayMain.changeOverlayImgLoading(0, true);
                }
                this.slotBeats.splice(this.currentActiveSlot, 1, this.firstMount?this.firstMountBeats:this.currentSlotBeats);
                this.slotBeatCounts.splice(0, 1, this.firstMount?this.firstMountBeats.length:this.currentSlotBeats.length);
                this.updateOverlay(this.firstMount?this.firstMountBeats:this.currentSlotBeats, this.currentActiveSlot);
            }
        },
        activated() {
            $(document).on('keyup', this.moveOverlay);
        },
        deactivated() {
            $(document).off('keyup', this.moveOverlay);
        },
        mounted() {
            this.qrsRenders = this.qrsRenders.map((qrsRender, index) => {
                return index === 0 ? new QrsRenderer(306, 150) : new QrsRenderer(150, 100);
            })
        }
    }
</script>
<style scoped lang="scss">
    .overlay-view {
        width: 100%;
        position: relative;
    }

    .overlay-view-header {
        display: flex;
    }

    .overlay-view-content {
        display: flex;
        margin-top: 10px;
    }

    .overlay-view-content-left {
        width: 310px;
        margin-right: 10px;
    }
</style>