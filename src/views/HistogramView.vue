<template>
    <section v-loading="pageLoading" style="position: relative">
        <noMessage v-if="showEmpty"></noMessage>
        <section style="position: absolute; right: 0; top:  -46px;" v-if="!showEmpty">
            <SelectTypeAside
                    @changeSelectType="changeSelectType"
            />
        </section>
        <section v-if="!showEmpty">
            <section>
                <HistogramBlock
                        ref="lineBlockView"
                        :showData="showData"
                        :canvas-height="300"
                        :onSelectChange="false"
                        :sendDatable="true"
                        @initStatus="initStatusHistogram"
                        @changeSelectArray="changeSelectArray"
                        @resetChangeFlag="resetChangeFlag"
                />
                <EcgFragments
                        ref="ecgFragments"
                        :isResetPage="Boolean(changeFlag)"
                        :sourceData="selectPositions"
                        :selectTypeNormal="currentBeatType"
                        :isSelectFirstBeat="true"
                        :pageIndex="1"
                        :size="{x: 9, y: 5}"
                        :wrapperSize="{width: 1460, height: 464}"
                        @resetTenEcg="resetTenEcg"
                        @handleChangePageState="handleChangePageState"
                        @handleSelectFragment="handleSelectFragment"
                        @handleChangeSize="handleChangeSize"
                />
            </section>
            <section style="position: relative">
                <el-button type="primary" style="position: absolute; right: 25px; top: 162px;z-index: 999"
                           @click="goToMain">跳转到原图
                </el-button>
                <slider @changePosition="changePosition" ref="slider" :width="1550"></slider>
                <TenSecondsEcg
                        ref="tenSecond"
                        :isClearState="isClearState"
                        :ecgPosition="tenSecondPosition"
                        @tagsChange="tagsChange"
                        @ecgChange="ecgChange"
                        @hasOperate="hasOperate"
                        @beatChange="beatChange"/>
                <HalfMinuteEcg :currentPosition="halfMinutePosition" ref="halfMinuteEcg" @curentActiveRange="curentActiveRange"/>
            </section>
        </section>
    </section>
</template>
<script>
    import TenSecondsEcg from '../components/common/FewSecondsEcg';
    import HalfMinuteEcg from '../components/common/HalfMinuteEcg.vue'
    import NoMessage from '../components/common/noMessage';
    import HistogramBlock from '../components/commonBlock/HistogramBlock';
    import CommonInit from '../assets/mixin/commonInit';
    import EcgFragments from '../components/common/EcgFragmentsWithPosition.vue';
    import SelectTypeAside from '../components/commonBlock/SelectTypeAside';
    import Slider from '../components/common/Slider.vue';

    export default {
        name: 'HistogramView',
        mixins: [CommonInit],
        components: {
            NoMessage,
            Slider,
            TenSecondsEcg,
            HalfMinuteEcg,
            HistogramBlock,
            EcgFragments,
            SelectTypeAside
        },
        data() {
            return {
                selectArray: [],
                tagStateIndex: 2,
                selectPositions: [],
                componentName: 'lineBlock'
            }
        },
        watch: {
            currentDate() {
                if (this.selectComponent === 'lineBlock') {
                    this.initStatusHistogram();
                    this.changeFlag = 1;
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
            changeSelectArray(val) {
                this.clearSelectArr();
                this.selectPositions = val;
                this.selectArray = val;
            },
            changeSelectType(type) {
                this.selectType = type;
                this.$refs.lineBlockView.initEcharts();
                this.caclShowData();
                this.changeFlag = 1
            }
        }
    }
</script>
<style scoped>

</style>