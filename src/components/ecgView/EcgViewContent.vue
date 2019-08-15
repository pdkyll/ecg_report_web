<template>
    <div style="position: relative;overflow: hidden;">
        <div class="reject" :class="{'slideRight': !isShowReject, 'slideLeft': isShowReject}" v-if="auditOpinions.length">
            <i class="el-icon-arrow-right reject-icon" @click="operateReject"></i>
            <div style="max-height: 90%;overflow: auto;box-sizing: border-box;width: 100%">
                <div class="reject-wrapper" v-for="(item, index) in auditOpinions">
                    <p class="title">驳回意见({{item.nickName}})</p>
                    <p class="time">{{item.time}}</p>
                    <p class="content">{{item.auditOpinions}}</p>
                </div>
            </div>
        </div>
        <NoMessage v-if="showEmpty"></NoMessage>
        <section v-if="!showEmpty">
            <BasicInfo @hasOperate="hideTwinkle"/>
            <div class="right-content">
                <div class="ecg-dayCards-box">
                    <EcgDayCards :dates="dateStatistics" @getEventEcg="getEventEcg"/>
                </div>
                <div>
                    <div class="ecg-rates-box">
                        <DragEcg :selectHour="selectHourNum" @change="changeEcgPos"/>
                    </div>
                    <div class="rr-scatter-box">
                        <RRIntervalScatter2 :ecgPos="ecgPosition" :tagPos="tagPos" :rhythm="rhythm"
                                            @change="changeEcgPos"></RRIntervalScatter2>
                    </div>
                    <div>
                        <FewSecondsEcg
                                ref="fewSecondsEcg"
                                :ecgPosition="ecgPosition"
                                :isEcgMain="true"
                                :isTwinkle="isTwinkle"
                                @ecgChange="ecgChange"
                                :RRShowState="RRShowState"
                                :add="gainSelected"
                                :rhythmTypeSelected="rhythmTypeSelected"
                                @hideTwinkle="hideTwinkle"
                                @clearRhythmTypeSelected="clearRhythmTypeSelected"
                                @disableRhythmTypeSelect="disableRhythmTypeSelect"
                                :jumpToRhythm="jumpToRhythm"
                                @tagsChange="tagsChange"
                        ></FewSecondsEcg>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>
<script>
    import {mapState, mapMutations, mapActions} from 'vuex'
    import BasicInfo from './BasicInfo.vue';
    import EcgDayCards from './EcgDayCards.vue';
    import DragEcg from '../dragEcg/DragEcg.vue';
    import RRIntervalScatter2 from './RRIntervalScatter2.vue';
    import FewSecondsEcg from '../common/FewSecondsEcg.vue';
    import Util from '../../common/util';
    import NoMessage from '../../components/common/noMessage';
    import API from '../../api/api_ecg_view';
    import {bus} from '../../bus';

    export default {
        name: 'EcgViewContent',
        props: {
            selectHour: {
                type: Number,
                default: 0
            },
            firstEcgPos: {
                type: Number,
                default: 0
            },
            dates: {
                type: Array,
                default: []
            }
        },
        components: {
            BasicInfo,
            EcgDayCards,
            DragEcg,
            FewSecondsEcg,
            RRIntervalScatter2,
            NoMessage
        },
        data() {
            return {
                auditOpinions: [],
                isShowReject: true,
                isTwinkle: false,
                curMin: -1,
                offsetPosition: -1,
                selectHourNum: 0,
                ecgPosition: -1,
                jumpToRhythm: null,
                tagPos: [],
                rhythm: [],
                dateStatistics: []
            }
        },
        watch: {
            firstEcgPos(firstEcgPos) {
                this.ecgPosition = firstEcgPos;
            },
            selectHour(selectHour) {
                this.selectHourNum = selectHour;
            },
            //点击左侧日期卡片，心电跳转至有效数据
            dayStartIndex(dayStartIndex) {
                if (this.clickDateState) {
                    this.hideTwinkle()
                    this.ecgPosition = dayStartIndex * this.samplingFrequency * 60;
                }
            },
            scrollDateIndex(scrollDateIndex) {
                if (this.ecgPosition !== -1) {
                    this.changeClickDateState(false);
                    let currentDate = new Date(this.ecgStartTime.split(' ')[0] + ' 00:00:00');
                    currentDate.setDate(currentDate.getDate() + scrollDateIndex);
                    this.changeCurrentDate(Util.formatTimeM(currentDate));
                    this.changeDateIndex(scrollDateIndex);
                    let blockIndex = (currentDate.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60;
                    this.changeDayStartIndex(blockIndex);//跳页后更新dayStartIndex,以便于下次点击日期卡重绘
                }
            },
            dates(dates) {
                this.dateStatistics = dates;
            }

        },
        created() {
            API.getAuditOpinionsList(this.report_id).then((data) => {
                this.auditOpinions = data.map((v, i) => {
                    return {...v, time: Util.formatDate.format(new Date(v.time),'yyyy-MM-dd hh:mm:ss')}
                })
            })
        },
        mounted() {

        },
        activated() {
            //从其他页切回整体报告主页，如果有修改，则更新当前页面
            if (this.isMainChange) {
                console.log('更新主页！');
                this.refreshHeartRate();//更新24小时心率图
                this.changeUpdateTagQState2(true);//更新1小时散点图
                bus.$emit('changeCurrentAbnormalList');//更新左侧卡片异常下拉列表
                this.updateDayCards();//更新左侧卡片统计信息
                setTimeout(()=>{
                    this.updateTags();//更新心电图上的心拍心律
                    this.updateVisibleData();//更新心电信号本身
                },0);
                this.changeMainState(false);
            }
        },
        computed: {
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                samplingFrequency: state => state.samplingFrequency,
                RRShowState: state => state.RRShowState,
                gainSelected: state => state.gainSelected,
                rhythmTypeSelected: state => state.rhythmTypeSelected,
                dayStartIndex: state => state.dayStartIndex,
                dateIndex: state => state.dateIndex,
                clickDateState: state => state.clickDateState,
                ecgDataLoading: state => state.ecgDataLoading,
                selectComponent: state => state.selectComponent,
                showEmpty: state => state.showEmpty,
                isMainChange: state => state.isMainChange
            }),
            scrollDateIndex: function () {
                return Math.floor((Math.floor(this.ecgPosition / (this.samplingFrequency * 60))
                    + Math.floor((new Date(this.ecgStartTime).getTime() - new Date(this.ecgStartTime.split(' ')[0] + ' 00:00:00').getTime()) / 1000 / 60)) / 1440)
            },
            report_id() {
                return localStorage.getItem('report_id');
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeRhythmTypeSelected',
                'changeJumpPosition',
                'changeRhythmTypeSelectDisabled',
                'changeDateIndex',
                'changeCurrentDate',
                'changeDayStartIndex',
                'changeClickDateState',
                'changeUpdateTagQState2',
                'changeMainState'
            ]),
            ...mapMutations('ecgDrag', [
                'changeHeartRates'
            ]),
            // 隐藏驳回意见
            operateReject() {
                this.isShowReject = !this.isShowReject
            },
            removeFewSecondsEvent() {
                this.$refs.fewSecondsEcg.removeAllEvent()
            },
            addFewSecondsEvent() {
                this.$refs.fewSecondsEcg.addAllEvents();
            },
            handleJump({position = -1, statu = false}) {
                if (statu) {
                    this.$refs.fewSecondsEcg.getBeatEcg(position);
                } else {
                    this.ecgPosition = position;
                    this.isTwinkle = !statu
                }
            },
            hideTwinkle() {
                this.isTwinkle = false;
            },
            handleReturnCurMin(val) {
                this.curMin = val;
            },
            returnMinutesOffset(val) {
                this.offsetPosition = val
            },
            //24小时心率图,当前一小时散点图改变心电时刻后触发的回调
            changeEcgPos(pos) {
                this.hideTwinkle()
                this.ecgPosition = pos;
            },
            ecgChange(pos) {
                this.selectHourNum = this.calcTime(pos, this.ecgStartTime).getHours();
                this.ecgPosition = pos;
            },
            calcTime(pos, startTime) {
                let startDate = new Date(startTime);
                startDate.setSeconds(startDate.getSeconds() + Math.floor(pos / this.samplingFrequency));
                return startDate;
            },
            //更新心率數據
            refreshHeartRate() {
                API.getHeartRates({
                    report_id: this.report_id
                }).then(data => {
                    this.changeHeartRates(data);
                });
            },
            //心律类型菜单相关
            clearRhythmTypeSelected() {
                this.changeRhythmTypeSelected('');
            },
            disableRhythmTypeSelect(state) {
                this.changeRhythmTypeSelectDisabled(state);
            },
            //左侧日期卡片
            getEventEcg(row) {
                this.$refs.fewSecondsEcg.getEventEcg(row);
            },
            //更新左侧的日期卡片统计信息
            updateDayCards() {
                API.getEcgDates({
                    report_id: this.report_id
                }).then(dates => {
                    this.dateStatistics = dates;
                });
            },
            updateTags() {
                this.$refs.fewSecondsEcg.updateTags();
            },
            updateVisibleData() {
                this.$refs.fewSecondsEcg.updateVisibleData();
            },

            //当前小时rr间期散点图相关
            tagsChange(data) {
                this.tagPos = data.tagPos;
                this.rhythm = data.rhythm;
            }
        }
    }
</script>
<style scoped lang="scss">
    @keyframes slideRight {
        0% {
            transform: translateX(0px);
        }
        100% {
            transform: translateX(298px);
        }
    }
    .slideRight {
        animation: slideRight 0.5s;
        -moz-animation: slideRight 0.5s;
        -webkit-animation: slideRight 0.5s;
        -o-animation: slideRight 0.5s;
        animation-fill-mode:forwards;
    }
    @keyframes slideLeft {
        0% {
            transform: translateX(298px);
        }
        100% {
            transform: translateX(0px);
        }
    }
    .slideLeft {
        animation: slideLeft 0.5s;
        -moz-animation: slideLeft 0.5s;
        -webkit-animation: slideLeft 0.5s;
        -o-animation: slideLeft 0.5s;
        animation-fill-mode:forwards;
    }
    .right-content {
        display: flex;
    }
    .reject {
        position: absolute;
        top: 50px;
        right: 0;
        height: 100%;
        z-index: 1000;
        .reject-icon {
            width: 30px;
            height: 30px;
            line-height: 30px;
            font-size: 26px;
            position: absolute;
            top:0;
            left: -28px;
            background: #ffffff;
            z-index: 3;
            box-sizing: border-box;
            border-top: 1px solid #cccccc;
            border-left: 1px solid #cccccc;
            border-bottom: 1px solid #cccccc;
            box-shadow: 0 1px 1px 0 rgba(144, 141, 141, 0.4);
        }
    }
    .reject-wrapper{
        width: 290px;
        padding: 20px 20px 20px 30px;
        background: #ffffff;
        border: 1px solid #cccccc;
        box-sizing: border-box;
        box-shadow: 0 1px 1px 1px rgba(144, 141, 141, 0.4);
        .title{
            color: #5a5a5a;
            font-size: 18px;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        .time {
            color: #333333;
            font-size: 12px;
            margin-top: 5px;
        }
        .content {
            color: #929292;
            font-size: 16px;
            margin-top: 10px;
        }
    }
    .ecg-dayCards-box {
        width: 220px;
        height: 760px;
        overflow-y: auto;
    }

    .ecg-rates-box, .rr-scatter-box {
        margin-left: 50px;
    }
</style>