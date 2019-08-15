<template>
    <div class="temp-correction" @click="handleHidePopup">
        <noMessage v-if="showEmpty"></noMessage>
        <div class="temp-correction-content clearfix" v-if="!showEmpty">
            <div class="clearfix fl">
                <div class="fl" style="margin-right: 10px">
                    <SelectTypeAside
                            :hasSelect="false"
                            direction="vertical"
                            :defaultIndex="0"
                            @changeSelectType="beatTypeSelect"
                    />
                </div>
                <div class="temp fl">
                    <dragCover
                            ref="dragCover"
                            :wrapperSize="{height: 538, width: 200}"
                            :visibleNumber="3"
                            direction="vertical"
                            :canvasWidth="52"
                            :isResetActive="changeFlag"
                            :currentBeats="currentBeats"
                            :currentBeatType="selectType"
                            @resetChangeFlag="resetChangeFlag"
                            @handleChangePageState="handleChangePageState"
                            @handleHidePopup="handleHidePopup"
                            @returnActivePositions="returnActivePositions"
                            @handleChangeBeats="handleChangeBeats"
                    ></dragCover>
                </div>
            </div>
            <div class="ecgs fl">
                <ecg-fragments
                        ref="ecgFragments"
                        :isInTemp="true"
                        :isResetPage="Boolean(changeFlag)"
                        :isSelectFirstBeat="true"
                        :sourceData="currentTempBeats"
                        :size="{x: 7, y: 6}"
                        :wrapperSize="{width:1170, height: 528}"
                        :higlightRangeSeconds="higlightRange"
                        :selectTypeNormal="selectType"
                        @resetTenEcg="resetTenEcg"
                        @handleChangePageState="handleChangePageState"
                        @handleSelectFragment="handleSelectFragment"
                        @handleChangeSize="handleChangeSize"
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
                    :ecgPosition="tenSecondPosition"
                    :isClearState="isClearState"
                    @tagsChange="tagsChange"
                    @ecgChange="ecgChange"
                    @hasOperate="hasOperate"
                    @beatChange="beatChange"
                />
            <HalfMinuteEcg :currentPosition="halfMinutePosition" ref="halfMinuteEcg" @curentActiveRange="curentActiveRange"
            ></HalfMinuteEcg>
        </div>
    </div>
</template>
<script type="text/ecmascript-6">
    import Util from '../common/util';
    import {mapState, mapMutations, mapActions} from 'vuex';
    import dragCover from '../components/common/dragCover.vue'
    import EcgFragments from '../components/common/EcgFragmentsWithPosition.vue'
    import FewSecondsEcg from '../components/common/FewSecondsEcg';
    import HalfMinuteEcg from '../components/common/HalfMinuteEcg.vue'
    import noMessage from '../components/common/noMessage';
    import commonInitMixin from '../assets/mixin/commonInit';
    import Slider from '../components/common/Slider.vue';
    import SelectTypeAside from '../components/commonBlock/SelectTypeAside';

    export default {
        components: {
            SelectTypeAside,
            EcgFragments,
            FewSecondsEcg,
            HalfMinuteEcg,
            dragCover,
            Slider,
            noMessage
        },
        mixins: [commonInitMixin],
        data() {
            return {
                currentBeats: [],
                componentName: 'block',
                tagStateIndex: 5,
                higlightRange: 0.7,
                selectType: 'N', // 右上角当前选中的心拍类型
                currentTempBeats: []
            }
        },
        created() {
        },
        watch: {
            showData() {
                this.currentBeats = this.showData
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
            ...mapMutations('ecgView', [
                'changeTagState',
                'changeViewLoadingState'
            ]),
            ...mapActions('ecgView', [
                'changeVSTagData'
            ]),
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
                if(obj.key === 'dragCover'){
                    this.changeFlag = 2
                } else {
                    this.changeFlag = 0
                }
            },
            // 从dragcover中返回得当前选中得模板心电数据
            returnActivePositions(positions) {
                this.currentTempBeats = positions
            },
            beatTypeSelect(item) {
                this.changeFlag = 1
                this.selectType = item
                this.caclShowData();
            }
        }
    }
</script>
<style type="text/css" scoped lang="scss">
    .temp-correction-header {
        display: flex;
    }

    .temp-correction-content {
        margin-top: 20px;
    }
    .temp1 {
        margin: 20px 0;
        height: 200px;
        width: 1000px;
    }
    .temp {
        margin: 0 20px 0 0;
        height: 538px;
        width: 200px;
    }
</style> 