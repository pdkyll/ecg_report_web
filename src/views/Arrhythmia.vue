<template>
    <div class="arrhythmia-wrapper" @click="hidePopup">
        <noMessage v-if="showEmpty"></noMessage>
        <div style="position: absolute; right: 0; top:  -46px;">
            <SelectTypeAside
                    :hasSelect="false"
                    :defaultIndex="0"
                    @changeSelectType="beatTypeSelect"
            />
        </div>
        <section class="gridBox">
            <section @click.stop>
                <section class="dragCover" v-show="!expandLineBlock && !expandOverlay && !expandScatter">
                    <dragCover
                            ref="dragCover"
                            :wrapperSize="{height: 150, width: 1070}"
                            :visibleNumber="6"
                            direction="horizontal"
                            :canvasWidth="52"
                            :isAnimate="true"
                            :defaultSelectAll="true"
                            :isResetActive="changeFlag"
                            :currentBeats="showData"
                            :currentBeatType="selectType"
                            @resetChangeFlag="resetChangeFlag"
                            @handleChangePageState="handleChangePageState"
                            @handleHidePopup="handleHidePopup"
                            @returnActivePositions="returnActivePositions"
                            @handleChangeBeats="handleChangeBeats"
                    ></dragCover>
                </section>
                <section class="animationBox ml10" v-show="!expandOverlay && !expandScatter">
                    <p v-if="selectData['histogram'].index !== -1" class="fixedNumber" :class="{'activeNumber': selectData['histogram'].index === currentIndex}" style="right: 85px;left: auto;">{{selectData['histogram'].index}}</p>
                    <el-button style="position: absolute; right: 10px; top: 0;z-index: 2000" size="small"
                               type="primary" @click="changeLineBlockSize">{{expandLineBlock ? '缩小' : '放大'}}
                    </el-button>
                    <section style="width: 100%">
                        <HistogramArrhythmia
                                ref="histogram"
                                :selectNumber="selectNumber"
                                :getData="selectData['histogram'].position"
                                :changeFlag="changeFlag"
                                :initStatusHistogram="initStatusHistogram"
                                :changeSelectArray="histogramChange"
                                :resetChangeFlag="resetChangeFlag"
                                :selectType="selectType"
                                :canvasLineBlockWidth="canvasLineBlockWidth"
                                :canvasLineBlockHeight="canvasLineBlockHeight"
                        />
                    </section>
                </section>
                <section  v-show="!expandLineBlock && !expandOverlay && !expandScatter" @click.stop>
                    <ecg-fragments
                            ref="ecgFragments"
                            :isInTemp="true"
                            :isShowRight="false"
                            :isResetPage="Boolean(changeFlag)"
                            :isSelectFirstBeat="true"
                            :sourceData="currentTempBeats"
                            :size="{x: 5, y: 5}"
                            :wrapperSize="{width:970, height: 442}"
                            :higlightRangeSeconds="higlightRange"
                            :selectTypeNormal="selectType"
                            @resetTenEcg="resetTenEcg"
                            @handleChangePageState="handleChangePageState"
                            @handleSelectFragment="handleSelectFragment"
                            @handleChangeSize="handleChangeSize"
                    ></ecg-fragments>
                </section>
            </section>
            <section style="padding-top: 10px" class="ml10">
                <section class="animationBox" v-show="!expandOverlay && !expandLineBlock">
                    <p v-if="selectData['scatter'].index !== -1" class="fixedNumber" :class="{'activeNumber': selectData['scatter'].index === currentIndex}">{{selectData['scatter'].index}}</p>
                    <el-button style="position: absolute; right: 10px; top: 10px;z-index: 2000" size="small"
                               type="primary" @click="changeScatterSize">{{expandScatter ? '缩小' : '放大'}}
                    </el-button>
                    <ScatterBlockView
                            ref="scatterBlockView"
                            :isPathEmptyReturnAll="false"
                            :showData="selectData['scatter'].position"
                            :canvasWidth="scatterCanvasWidth"
                            :defaultWidth="500"
                            @initStatus="initStatusScatter"
                            @resetChangeFlag="resetChangeFlag"
                            @changeSelectArray="scatterChange"
                    />
                </section>
                <section class="animationBox" v-show="!expandScatter && !expandLineBlock" >
                    <p v-if="selectData['overlay'].index !== -1" class="fixedNumber" :class="{'activeNumber': selectData['overlay'].index === currentIndex}">{{selectData['overlay'].index}}</p>
                    <el-button style="position: absolute; right: 10px; top: 10px;z-index: 2000" size="small"
                               type="primary" @click="changeOverlaySize">{{expandOverlay ? '缩小' : '放大'}}
                    </el-button>
                    <OverlayMainArrhythmia :width="overlayMainArrhythmia.width"
                                           :height="overlayMainArrhythmia.height"
                                           :picSrc="overlaySrc"
                                           ref="overlay"
                                           :slotBeatCounts="selectData['overlay'].position.length"
                                           @selectOverlayArea="overlayChange"
                    >

                    </OverlayMainArrhythmia>
                </section>
            </section>
        </section>
        <div v-show="isShowBottom" style="position: relative" @click.stop>
            <el-button type="primary" style="position: absolute; right: 25px; top: 162px;z-index: 999"
                       @click="goToMain">跳转到原图
            </el-button>
            <slider @changePosition="changePosition" ref="slider" :width="1550"></slider>
            <FewSecondsEcg
                    ref="tenSecond"
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
<script type="text/ecmascript-6">
    import Util from '../common/util';
    import {mapState, mapMutations, mapActions} from 'vuex';
    import dragCover from '../components/common/dragCoverMultiple.vue'
    import EcgFragments from '../components/common/EcgFragmentsWithPosition.vue'
    import FewSecondsEcg from '../components/common/FewSecondsEcg';
    import HalfMinuteEcg from '../components/common/HalfMinuteEcg.vue'
    import noMessage from '../components/common/noMessage';
    import commonInitMixin from '../assets/mixin/commonInit';
    import Slider from '../components/common/Slider.vue';
    import SelectTypeAside from '../components/commonBlock/SelectTypeAside';
    import OverlayMainArrhythmia from '../components/overlayView/OverlayMainArrhythmia.vue';
    import ScatterBlockView from '../components/commonBlock/ScatterBlock';
    import {QrsRenderer} from '../common/qrs_renderer';
    import HistogramArrhythmia from '../components/block/HistogramArrhythmia';
    export default {
        mixins: [commonInitMixin],
        components: {
            SelectTypeAside,
            EcgFragments,
            FewSecondsEcg,
            HalfMinuteEcg,
            dragCover,
            Slider,
            noMessage,
            OverlayMainArrhythmia,
            HistogramArrhythmia,
            ScatterBlockView
        },
        data() {
            return {
                selectNumber: '', // 模板选中的模板
                selectData: {
                    scatter: {position: [], index: -1},
                    overlay: {position: [], index: -1},
                    histogram: {position: [], index: -1},
                },
                currentIndex: -1,
                componentName: 'arrhythmia',
                tagStateIndex: 6,
                higlightRange: 0.7,
                selectType: 'N', // 右上角当前选中的心拍类型
                currentTempBeats: [],
                lineBlockData: [],
                overlayMainArrhythmia: {
                    width: 500,
                    height: 270
                },
                overlaySrc: '',
                scatterCanvasWidth: 500,
                canvasLineBlockHeight: 200,
                canvasLineBlockWidth: 1070,
                beatsPos: [],
                overlayEcgSlices: [],
                showDataObj:{},
                overlaySelect:{
                    left:0,
                    right:0,
                    top:0,
                    bottom:0
                },
                expandScatter: false,
                expandOverlay: false,
                expandLineBlock: false
            }
        },
        computed: {},
        watch: {
            showData() {
                this.showData.forEach(beat=>{
                   this.showDataObj[beat.p]=beat;
                });
            },
            currentDate() {
                if (this.selectComponent === this.componentName) {
                    this.changeFlag = 1
                    this.showPosition = -1
                    this.$refs.tenSecond.clear()
                }
            }
        },
        methods: {
            initStatusHistogram() {
                this.selectPositions = [];
                this.selectArray = [];
                this.$refs.lineBlockView.initEcharts();
            },
            ...mapMutations('ecgView', [
                'changeTagState',
                'changeViewLoadingState'
            ]),
            ...mapActions('ecgView', [
                'changeVSTagData'
            ]),
            hidePopup() {
                this.$refs.dragCover.isShowTempPopup = false
                this.handleHidePopup()
            },
            handleHidePopup() {
                this.$refs.ecgFragments.isShowTempPopup = false
                this.$refs.dragCover.isShowTempPopup = false
            },
            clear(key) {
                if (key === 'scatter') {
                    this.$refs.scatterBlockView.clearAllLayer()
                } else if (key === 'overlay') {
                    this.$refs.overlay.resetDragArea()
                } else if (key === 'histogram') {
                    this.$refs.histogram.clearAllInSelect()
                }
            },
            changeSelectData(name, position,  status = true) {
                if (status) {
                    if (this.selectData[name].index === -1) {
                        this.currentIndex ++;
                        this.selectData[name].index = this.currentIndex
                    } else {
                        this.currentIndex = this.selectData[name].index
                    }
                } else {
                    this.currentIndex = this.selectData[name].index - 1<= 0?0: this.selectData[name].index - 1
                    this.selectData[name].index = -1
                }
                for (let key in  this.selectData) {
                    if (this.selectData[key].index !== -1 && this.selectData[key].index > this.currentIndex && key !== name) {
                        this.selectData[key].position = position
                        this.selectData[key].index = -1
                        this.clear(key)
                        if (key === 'overlay') {
                            this.getOverlayData(position)
                        }
                    } else if (this.selectData[key].index === -1  && key !== name) {
                        this.selectData[key].position = position
                        if (key === 'overlay') {
                            this.getOverlayData(position)
                        }
                    }
                }
                this.currentTempBeats = position;
                this.changeFlag = 1
            },
            overlayChange(l, r, t, b,status) {
                this.changeSelectData('overlay', Util.deepCopy(this.selectOverlayArea(l, r, t, b,state)),status);
            },
            scatterChange(position, status = true) {
                this.changeSelectData('scatter', position, status)
            },
            histogramChange(position, status = true) {
                this.changeSelectData('histogram', position, status)
            },
            beatChange() {
                this.changeFlag = 0
            },
            handleHidePopup() {
                this.$refs.ecgFragments.isShowTempPopup = false
                this.$refs.dragCover.isShowTempPopup = false
            },
            // 从dragcover中返回需要修改的数据 因为2s心电组件中有完整的操作流程 所以交给心电组件修改
            handleChangeBeats(obj) {
                this.$refs.ecgFragments.editBeatType(obj.to, obj.positions, obj.updateMode)
            },
            // 修改心拍
            handleChangePageState(obj) {
                if (obj.key === 'dragCover') {
                    this.changeFlag = 2
                } else {
                    this.changeFlag = 0
                }
            },
            // 从dragcover中返回得当前选中得模板心电数据
            returnActivePositions(position) {
                let positions = Util.deepCopy(position)
                this.selectNumber = this.$refs.dragCover.activeIdArr.length !== 0?Util.deepCopy(this.$refs.dragCover.activeIdArr).sort((a, b) => a-b).join(''):'';
                if (this.changeFlag === 1 || this.changeFlag === 2) {
                    let key = ['histogram','scatter','overlay']
                    key.forEach((item) => {
                        this.selectData[item] = {position: positions, index: -1, key: item}
                        this.clear(item)
                    })
                    this.currentIndex = 0;
                    this.getOverlayData(this.selectData['overlay'].position);
                    this.currentTempBeats = positions;
                } else {
                    let filterArr = positions
                    let selectData = Object.values(this.selectData).sort((a, b) => {
                        if (a.index < 0 || b.index < 0) {
                            return b.index - a.index
                        } else {
                           return a.index - b.index
                        }
                    })
                    selectData.forEach((item) => {
                        this.selectData[item.key].position = filterArr
                        if (item.index !== -1) {
                            filterArr = this.componentFilterData(item.key, this.selectData[item.key].position)
                        } else if(item.index === -1 && item.key === 'overlay') {
                            this.getOverlayData(this.selectData['overlay'].position)
                        }
                    })
                    this.currentTempBeats = filterArr;
                }
            },
            componentFilterData(key, position) {
                if (key === 'scatter') {
                    return this.$refs.scatterBlockView.getSelectData(this.selectData['scatter'].position)
                } else if (key === 'overlay') {
                    this.getOverlayData(position)
                    return this.selectOverlayArea()
                } else if (key === 'histogram') {
                    return this.$refs.histogram.getSelectData(this.selectData['histogram'].position)
                }
            },
            getOverlayData(position) {
                let positions = position
                this.beatsPos = positions.map(beat => {
                    return beat.p;
                });
                this.createOverlayPic(this.beatsPos);
            },
            beatTypeSelect(item) {
                this.changeFlag = 1;
                this.selectType = item;
                this.caclShowData();
            },
            initStatusScatter() {
            },
            /**
             * 修改散点图尺寸
             */
            changeScatterSize() {
                if (this.expandScatter) {
                    $('.gridBox').css({
                        'grid-template-columns': '1070px 500px'
                    });
                    this.scatterCanvasWidth = 500;
                } else {
                    $('.gridBox').css({
                        'grid-template-columns': '0 1500px'
                    });
                    this.scatterCanvasWidth = 700;
                }
                this.expandScatter = !this.expandScatter;
            },
            /**
             * 修改叠加图尺寸
             */
            changeOverlaySize() {
                if (this.expandOverlay) {
                    $('.gridBox').css({
                        'grid-template-columns': '1070px 500px'
                    });
                    this.overlayMainArrhythmia = {
                        width: 500,
                        height: 270
                    };
                } else {
                    $('.gridBox').css({
                        'grid-template-columns': '0 1500px'
                    });
                    this.overlayMainArrhythmia = {
                        width: 1070,
                        height: 600
                    };
                }
                this.createOverlayPic(this.beatsPos);
                this.expandOverlay = !this.expandOverlay;
            },
            /**
             * 修改直方图尺寸
             */
            changeLineBlockSize() {
                if (this.expandLineBlock) {
                    $('.gridBox').css({
                        'grid-template-columns': '1070px 500px'
                    });
                    this.canvasLineBlockHeight = 200;
                    this.canvasLineBlockWidth = 1070;
                } else {
                    $('.gridBox').css({
                        'grid-template-columns': '1500px 0px'
                    });
                    this.canvasLineBlockHeight = 340;
                    this.canvasLineBlockWidth = 1500;
                }
                this.expandLineBlock = !this.expandLineBlock;
            },
            //生成叠加图
            createOverlayPic(beats) {
                this.qrsRenderer = new QrsRenderer(this.overlayMainArrhythmia.width, this.overlayMainArrhythmia.height);
                this.ecgLoader.getSlices(beats, this.samplingFrequency / 2, this.samplingFrequency / 2, (slices) => {
                    this.overlayEcgSlices = slices;
                    this.overlaySrc = this.qrsRenderer.render(slices);
                })
            },
            selectOverlayArea(l, r, t, b,state) {
                if(l!==undefined){
                    this.overlaySelect={left:l,right: r,top:t,bottom:b};
                }
                let {left,right,top,bottom}=this.overlaySelect;
                //获取叠加图框选的心拍
                let selectBeats=this.qrsRenderer.select(this.overlayEcgSlices, left, right, top, bottom);
                if(left===right&&top===bottom){
                    selectBeats=this.beatsPos;
                }
                return this.formatSelectOverlayArea(selectBeats);
            },
            formatSelectOverlayArea(selects){
                let res=[];
                selects.forEach(v=>{
                    res.push(this.showDataObj[v]);
                });
                return res
            }
        },
        mounted() {

        }
    }
</script>
<style type="text/css" scoped lang="scss">
    .fixedNumber {
        position: absolute;
        font-size: 25px;
        top: 8px;
        left: 70px;
        height: 30px;
        width: 30px;
        line-height: 30px;
        text-align: center;
        z-index: 1000;
        color: #3b96c5;
        border: 1px solid #3b96c5;
        border-radius: 50%;
    }
    .ml10{
        margin-left: 15px;
    }
    .activeNumber {
        border-color: #ff8000;
        color: #ff8000;
    }
    .arrhythmia-wrapper {
        position: relative;
    }

    .dragCover {
        margin: 10px 0;
    }

    .gridBox {
        position: relative;
        box-sizing: border-box;
        display: grid;
        grid-template-columns: 1070px 500px;
        /*overflow: hidden;*/
        transition: all linear .5s;
    }

    .animationBox {
        position: relative;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: space-around;
    }

    .overflowBox {
        overflow: hidden;
    }
</style> 