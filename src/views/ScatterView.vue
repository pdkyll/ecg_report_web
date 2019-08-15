<template>
    <section v-loading="pageLoading" style="position: relative">
        <noMessage v-if="showEmpty"></noMessage>
        <section style="position: absolute; right: 0; top:  -46px;"  v-if="!showEmpty">
            <SelectTypeAside
                    @changeSelectType="changeSelectType"
            />
        </section>
        <section v-if="!showEmpty">
            <!--<button @click="changeCanvasWidth">修改尺寸</button>-->
            <section class="scatterContent">
                <ScatterBlockView
                        ref="scatterBlockView"
                        :showData="showData"
                        :canvasWidth="canvasWidth"
                        :changeFlag="changeFlag"
                        @initStatus="initStatusScatter"
                        @resetChangeFlag="resetChangeFlag"
                        @changeSelectArray="changeSelectArray"
                />
                <EcgFragments
                        ref="ecgFragments"
                        :isResetPage="Boolean(changeFlag)"
                        :sourceData="selectPositions"
                        :isSelectFirstBeat="true"
                        :pageIndex="0"
                        :size="{x: 5, y: 7}"
                        :selectTypeNormal="currentBeatType"
                        :wrapperSize="{width: 766, height: 676}"
                        @resetTenEcg="resetTenEcg"
                        @handleChangePageState="handleChangePageState"
                        @handleSelectFragment="handleSelectFragment"
                        @handleChangeSize="handleChangeSize"
                />
            </section>
            <section v-show="isShowBottom" style="position: relative;">
                <el-button type="primary" style="position: absolute; right: 25px; top: 162px;z-index: 999"
                       @click="goToMain">跳转到原图
                </el-button>
                <slider @changePosition="changePosition" ref="slider" :width="1550"></slider>
                <TenSecondsEcg
                        ref="tenSecond"
                        :ecgPosition="tenSecondPosition"
                        :isClearState="isClearState"
                        @tagsChange="tagsChange"
                        @hasOperate="hasOperate"
                        @beatChange="beatChange"
                        @currentEcgPosChange="currentEcgPosChange"
                        @ecgChange="ecgChange"/>
                <HalfMinuteEcg :currentPosition="halfMinutePosition" ref="halfMinuteEcg" @curentActiveRange="curentActiveRange"/>
            </section>
        </section>
    </section>
</template>
<script>
    import ScatterBlockView from '../components/commonBlock/ScatterBlock';
    import EcgFragments from '../components/common/EcgFragmentsWithPosition.vue'
    import TenSecondsEcg from '../components/common/FewSecondsEcg';
    import HalfMinuteEcg from '../components/common/HalfMinuteEcg.vue'
    import NoMessage from '../components/common/noMessage';
    import CommonInit from '../assets/mixin/commonInit';
    import Slider from '../components/common/Slider.vue';
    import SelectTypeAside from '../components/commonBlock/SelectTypeAside';

    export default {
        name: 'ScatterView',
        mixins: [CommonInit],
        components: {
            ScatterBlockView,
            EcgFragments,
            TenSecondsEcg,
            HalfMinuteEcg,
            NoMessage,
            Slider,
            SelectTypeAside
        },
        data() {
          return {
              selectPositions: [],
              tagStateIndex: 1,
              canvasWidth: 700,
              componentName: 'scatter'
          }
        },
        watch: {
            currentDate() {
                if (this.selectComponent === 'scatter') {
                    this.changeFlag = 1;
                    this.$refs.scatterBlockView.clearAllLayer();
                    this.showPosition = -1;
                    this.$refs.tenSecond.clear()
                }
            },
            showData() {
                if (this.changeFlag) {
                    this.changeSelectArray(this.showData);
                } else {
                    this.changeSelectArray(this.$refs.scatterBlockView.getSelectData(this.showData));
                }
            }
        },
        methods: {
            currentEcgPosChange(pos) {
//                console.log(pos);
            },
            initStatusScatter() {
            },
            changeCanvasWidth() {
              if(this.canvasWidth === 700) {
                  this.canvasWidth = 300;
              } else {
                  this.canvasWidth = 700;
              }
            },
            changeSelectArray(val) {
                this.clearSelectArr();
                this.selectPositions = val;
            },
            changeSelectType(type) {
                this.selectType = type;
                this.currentBeatType = type;
                this.clearSelectArr();
                this.$refs.scatterBlockView.clearAllLayer();
                this.caclShowData();
                this.changeFlag = 1;
            }
        }
    }
</script>
<style scoped>
    .scatterContent {
        margin-top: 5px;
        display: grid;
        grid-template-columns: 700px 840px;
        box-sizing: border-box;
    }
</style>