<template>
    <div class="view-box" v-loading="tagsLoading" style="position: relative">
        <noMessage v-if="showEmpty"></noMessage>
        <section v-if="!showEmpty">
            <section style="position: absolute; right: 0; top: -46px;">
                <el-button @click="toggleHeatTime">
                    {{showDiffChart ? '热力图' : '差异度'}}
                </el-button>
            </section>
            <div class="navigator" v-if="!showEmpty">
                <AFHeatMapChart
                        class="navigator-chart"
                        :style="{visibility : !showDiffChart && !tagsLoading ? 'visible' : 'hidden'}"
                        :handleMenuOperation="handleMenuOperation"
                        :handleMenuVisible="handleMenuVisible"/>
                <AFDiffDegreeChart
                        class="navigator-chart"
                        :style="{visibility : showDiffChart && !tagsLoading ? 'visible' : 'hidden'}"
                        :handleMenuOperation="handleMenuOperation"
                        :handleMenuVisible="handleMenuVisible"/>
                <canvas id="myCavansHeat" width="1570px" height="20px" style="position: absolute; bottom: 14px;pointer-events: none;"></canvas>

            </div>
            <div class="flexBox">
                <AFFragmentList/>
                <RRILineChartView class="rri-chart" :handleMenuOperation="handleMenuOperation"
                                  @returnPosition="returnPosition"
                                  :handleMenuVisible="handleMenuVisible"/>
            </div>
            <div style="position: relative">
                <el-button type="primary" style="position: absolute; right: 25px; top: 162px;z-index: 999"
                           @click="goToMain">跳转到原图
                </el-button>
                <slider @changePosition="changePosition" ref="slider" :width="1550"></slider>
                <TenSecondsEcg
                        ref="tenSecond"
                        :ecgPosition="tenSecondPosition"
                        @ecgChange="ecgChange"
                        @hasOperate="hasOperate"
                        @beatChange="beatChange"
                />
                <HalfMinuteEcg :currentPosition="halfMinutePosition" ref="halfMinuteEcg" @curentActiveRange="curentActiveRange"
                ></HalfMinuteEcg>
            </div>
            <el-dialog
                    :visible.sync="dragEditDialogState"
                    width="400px"
                    center
                    top="430px"
                    :show-close="false"
                    :close-on-click-modal="false"
                    :close-on-press-escape="false"
            >
                <div class="edit-dialog-content">
                    <div>
                        发生时刻：
                        <el-time-picker
                                v-model="dragEditTime"
                                :picker-options="{
                                selectableRange: '00:00:00 - 23:59:59'
                            }"
                                @change="changeStartTime"
                                placeholder="发生时刻">
                        </el-time-picker>
                    </div>
                    <div>
                        结束时刻：
                        <el-time-picker
                                v-model="dragEndTime"
                                :picker-options="{
                                selectableRange: `00:00:00 - 23:59:59`
                            }"
                                @change="changeStartTime"
                                placeholder="结束时刻">
                        </el-time-picker>
                    </div>
                    <div>
                        持续时间：
                        <el-time-picker
                                v-model="dragEditTimeLen"
                                :picker-options="{
                                selectableRange: '00:00:10 - 23:59:59'
                            }"
                                @change="changeExistTime"
                                placeholder="持续时间">
                        </el-time-picker>
                    </div>
                    <div style="height: 40px;line-height: 40px">
                        事件类型：
                        <el-radio v-model="dragEditRhythmType" label="AF">房颤</el-radio>
                        <el-radio v-model="dragEditRhythmType" label="AFLUT">房扑</el-radio>
                    </div>
                </div>
                <span slot="footer" class="dialog-footer">
                 <el-button type="primary" @click="confirmDragEdit">修改</el-button>
                 <el-button @click="cancelDragEdit">取 消</el-button>
            </span>
            </el-dialog>
        </section>
    </div>
</template>

<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import AFHeatMapChart from '../components/afView/AFHeatMapChart.vue';
    import AFDiffDegreeChart from '../components/afView/AFDiffDegreeChart.vue';
    import RRILineChartView from '../components/afView/RRILineChartView';
    import AFFragmentList from '../components/afView/AFFragmentList.vue';
    import TenSecondsEcg from '../components/common/FewSecondsEcg';
    import HalfMinuteEcg from '../components/common/HalfMinuteEcg.vue'
    import Util from '../common/util';
    import Slider from '../components/common/Slider.vue';
    import {LabelSet} from '../common/label_set';
    import noMessage from '../components/common/noMessage';
    import CommonInit from '../assets/mixin/commonInit';

    export default {
        name: 'AFView',
        mixins: [CommonInit],
        data() {
            return {
                dragEditDialogState: false,
                dragEditTime: '',
                dragEndTime: '',
                dragEditTimeLen: '',
                dragEditRhythmType: 'AF',
                drawData: [],
                tagStateIndex: 3,
                componentName: 'afView'
            };
        },
        components: {
            RRILineChartView,
            AFHeatMapChart,
            Slider,
            AFDiffDegreeChart,
            AFFragmentList,
            TenSecondsEcg,
            HalfMinuteEcg,
            noMessage
        },
        computed: {
            ...mapState('afView', {
                tagsLoading: state => state.tagsLoading,
                showDiffChart: state => state.showDiffChart,
                selectedRange: state => state.selectedRange,
                afFragmentData: state => state.afFragmentData,
            }),
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                validDates: state => state.validDates,
                dateIndex: state => state.dateIndex,
                selectComponent: state => state.selectComponent,
                datesIsContainData: state => state.datesIsContainData
            }),
            formatYMD: function () {
                return this.validDates[this.dateIndex].replace(/\-/g, '/');
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeCurrentDateTags',
            ]),
            ...mapMutations('afView', [
                'changeSelectedRange',
                'changeAfFragmentData2',
                'changeShowDiffChart',
                'changeTagsLoading'
            ]),
            toggleHeatTime() {
                this.changeShowDiffChart(!this.showDiffChart);
            },
            returnPosition(pos) {
                this.showPosition = pos.val;
            },
            /**
             * 修改房扑房颤节律开始时间而引起持续时间变化
             */
            changeStartTime() {
                let startTime = new Date(this.dragEditTime).getTime();
                let endTime = new Date(this.dragEndTime).getTime();
                if (endTime < startTime) {
                    let temp = this.dragEditTime;
                    this.dragEditTime = this.dragEndTime;
                    this.dragEndTime = temp;
                }
                this.dragEditTimeLen = new Date(this.formatYMD + ' ' + Util.calcTimeLength(new Date(this.dragEditTime), new Date(this.dragEndTime)));
            },
            /**
             * 修改房扑房颤持续时间而引起结束时间变化
             */
            changeExistTime() {
                let startTime = new Date(this.dragEditTime).getTime();
                let timeLen = new Date(this.dragEditTimeLen).getTime();
                let baseTime = new Date(this.formatYMD + ' ' + '00:00:00').getTime();
                let currentDay = new Date(startTime).getDay();
                let newDay = new Date(startTime + timeLen - baseTime).getDay();
                if (newDay !== currentDay) {
                    this.dragEndTime = new Date(this.formatYMD + ' ' + '23:59:59');
                    startTime = new Date(this.dragEndTime).getTime();
                    this.dragEditTime = new Date(this.formatYMD + ' ' + Util.formatTimeH(new Date(startTime - timeLen + baseTime)));
                } else {
                    this.dragEndTime = new Date(this.formatYMD + ' ' + Util.formatTimeH(new Date(startTime + timeLen - baseTime)));
                }
            },
            initCanvas() {
                let c_canvas = document.getElementById('myCavansHeat');
                if(c_canvas===null){
                    return;
                }
                let context = c_canvas.getContext("2d");
                let width = 1490;
                let height = c_canvas.height;
                context.clearRect(0, 0, width, height);
                context.beginPath();
                this.drawData.map(item => {
                    let x = item.begin * width + 40;
                    let endWidth = item.end * width + 2;
                    context.fillStyle = '#ff4f04';
                    if (item.type === 'AFLUT') {
                        context.fillStyle = '#1c87ff'
                    }
                    context.fillRect(x, 0, endWidth, 4);
                });
                context.stroke();
                context.closePath();
            },
            timeToPer(time) {
                let i = 3600;
                let calcSec = 0;
                time.split(':').map(item => {
                    calcSec += Number(item) * i;
                    i = parseInt(i/60);
                });
                return calcSec / 86400;
            },
            handleMenuOperation(command) {
                if (command === 'add') {
                    this.dragEditDialogState = true;
                } else {
                    if (this.selectedRange !== null) {
                        let formatAfFragmentData = this.formatAfFragments();
                        if (formatAfFragmentData.length !== 0) {
                            let begin = this.selectedRange.from;
                            let end = this.selectedRange.to;
                            this.$confirm('确定要删除这段心律?', '提示', {
                                confirmButtonText: '确定',
                                cancelButtonText: '取消',
                                type: 'warning'
                            }).then(() => {
                                let ls = new LabelSet();
                                ls.setLabels(formatAfFragmentData);
                                ls.erase(begin, end);
                                this.changeAfFragmentData2(this.formatLabels(ls.getLabels()));
                            }).catch(() => {

                            });
                        } else {
                            this.$message({
                                message: '房颤临时表无数据，不能进行该操作',
                                type: 'warning'
                            });
                        }
                    }
                }
            },
            handleMenuVisible(visible) {
                if (!visible) {
                    this.changeSelectedRange(null);
                }
            },
            confirmDragEdit() {
                let formatYMD = this.validDates[this.dateIndex].replace(/\-/g, '/');
                let formatAfFragmentData = this.formatAfFragments();
                let editStartPos = (new Date(this.dragEditTime).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                let editEndPos = editStartPos + (this.dragEditTimeLen.getTime() - new Date(formatYMD + ' 00:00:00').getTime()) / 1000 * 512;
                if (editStartPos < 0) {
                    this.$message.error('所选区域超出有效范围，请重新选择!');
                    return;
                }
                let ls = new LabelSet();
                ls.setLabels(formatAfFragmentData);
                ls.set(this.dragEditRhythmType, editStartPos, editEndPos);
                this.dragEditDialogState = false;
                this.changeAfFragmentData2(this.formatLabels(ls.getLabels()));
            },
            cancelDragEdit() {
                this.dragEditDialogState = false;
            },
            //将labels数组(集合操作临时列表的模块)转为临时列表的数据结构
            formatLabels(labels) {
                let startDate = null;
                let endDate = null;
                return labels.map(label => {
                    let date = new Date(this.ecgStartTime);
                    date.setSeconds(date.getSeconds() + parseInt(label.begin / 512));
                    startDate = date;
                    let time = Util.formatTimeH(startDate);
                    date = new Date(this.ecgStartTime);
                    date.setSeconds(date.getSeconds() + parseInt(label.end / 512));
                    endDate = date;
                    return {
                        time: time,
                        endDate:Util.formatTimeH(date),
                        timeLen: Util.calcTimeLength(startDate, endDate),
                        type: label.type,
                        isSavedState: false
                    }
                })
            },
            //将临时列表转为labels数组(集合操作临时列表的模块)
            formatAfFragments() {
                let formatYMD = this.validDates[this.dateIndex].replace(/\-/g, '/');
                return this.afFragmentData.map(v => {
                    let date = new Date(formatYMD + ' ' + v.time);
                    let beginPos = (date.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                    let seconds = (new Date(formatYMD + ' ' + v.timeLen).getTime() - new Date(formatYMD + ' 00:00:00').getTime()) / 1000;
                    let endPos = beginPos + seconds * 512;
                    return {
                        begin: beginPos,
                        end: endPos,
                        type: v.type
                    }
                });
            }
        },
        mounted() {},
        watch: {
            selectedRange: function () {
                if (this.selectedRange != null) {
                    let startDate = new Date(this.ecgStartTime);
                    startDate.setSeconds(startDate.getSeconds() + Math.floor(this.selectedRange.from / 512));
                    this.dragEditTime = startDate;
                    let endPos=this.selectedRange.to;
                    //横向拖动选择的时间片段必须大于等于10秒,否则重置为10秒
                    if (this.selectedRange.to - this.selectedRange.from < 512 * 10) {
                        endPos = this.selectedRange.from + 512 * 10;
                    }
                    let endDate = new Date(this.ecgStartTime);
                    endDate.setSeconds(endDate.getSeconds() + Math.floor(endPos / 512));
                    this.dragEndTime = endDate;
                    let tempEditTimeLen = this.validDates[this.dateIndex].replace(/\-/g, '/') + ' ' + Util.calcTimeLength(startDate, endDate);
                    this.dragEditTimeLen = new Date(tempEditTimeLen);
                }
            },
            afFragmentData: function () {
                if (this.afFragmentData.length) {
                    let temp = [];
                    this.afFragmentData.map( item => {
                        temp.push({
                            begin: this.timeToPer(item.time),
                            end: this.timeToPer(item.timeLen),
                            type: item.type
                        })
                    });
                    this.drawData = temp;
                    this.initCanvas();
                }else {
                    let c_canvas = document.getElementById('myCavansHeat');
                    let context = c_canvas.getContext("2d");
                    context.clearRect(0, 0, c_canvas.width, c_canvas.height)
                }
            }
        },
        destroyed(){

        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    div.view-box {
        width: 100%;

        div.navigator {
            position: relative;
            margin-top: 2px;
            height: 300px;
            box-sizing: content-box;

            .navigator-chart {
                position: absolute;
                left: 0px;
                top: 0px;
                right: 0px;
                bottom: 0px;
            }
        }

        .rri-chart {
            width: 600px;
            height: 300px;
        }
    }

    .flexBox {
        display: flex;
        justify-content: space-around;
        &>div {
            flex: 1;
        }
    }

    .edit-dialog-content > div {
        margin-bottom: 10px;
    }
</style>
