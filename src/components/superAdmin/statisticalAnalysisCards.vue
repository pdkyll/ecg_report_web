<template>
    <div class="statistical-column" v-loading="cardsLoading">
        <el-card class="column-item">
            <div class="column-item-1">
                <el-popover
                        placement="bottom"
                        width="200"
                        trigger="hover">
                    <div style="font-size: 12px">
                        <p>总报告数：所选时段内，所选医院的报告总是。包含未上传、上传失败、分析失败、分析中、待分析、分析完、标注中、审核中、已审核、已完成状态的所有数据。</p>
                        <p class="mg-t-8">周环比：上周报告总数/上上周报告总数之比</p>
                        <p class="mg-t-8">日环比：昨天报告总数/前天报告总数之比</p>
                        <p class="mg-t-8">日均报告数：报告总数/所选时间段天数</p>
                        <p class="mg-t-8">今日报告数：当前日期的报告数</p>
                    </div>
                    <span class="hover-icon" slot="reference">i</span>
                </el-popover>
                <p class="title color-gray">总报告数</p>
                <p class="num">{{cardsInfo['ALL'].totalCount}}</p>
                <div class="clearfix column-item-4" style="padding-top: 40px">
                    <div class="fl column-item-2">
                        <span class="color-gray m-r-10">周环比</span>
                        <i :class="cardsInfo['ALL'].weekRatio > 1 ? 'triangle1 m-r-10':'triangle2 m-r-10'" v-if="cardsInfo['ALL'].weekRatio !== 'NaN' && cardsInfo['ALL'].weekRatio !== 0"></i>
                        <span class="color-black m-r-10">{{cardsInfo['ALL'].weekRatio === 'NaN'? '-':cardsInfo['ALL'].weekRatio?(cardsInfo['ALL'].weekRatio * 100).toFixed(2): '-'}}%</span>
                    </div>
                    <div class="fl column-item-2">
                        <span class="color-gray m-r-10">日环比</span>
                        <i :class="cardsInfo['ALL'].dayRatio > 1 ? 'triangle1 m-r-10':'triangle2 m-r-10'" v-if="cardsInfo['ALL'].dayRatio !== 'NaN' && cardsInfo['ALL'].dayRatio !== 0"></i>
                        <span class="color-black">{{cardsInfo['ALL'].dayRatio === 'NaN'? '-': cardsInfo['ALL'].dayRatio?(cardsInfo['ALL'].dayRatio * 100 ).toFixed(2): '-'}}%</span>
                    </div>
                </div>
            </div>
            <div class="column-item-3 clearfix">
                <p class="fl color-black">日均报告数：<span class="color1">{{cardsInfo['ALL'].dayAvg === 'NaN'? '-':Math.ceil(cardsInfo['ALL'].dayAvg * 10)/10}}</span>
                </p>
                <p class="fl color-black">今日报告数：<span class="color1">{{cardsInfo['ALL'].todayCount === 'NaN'? '-':cardsInfo['ALL'].todayCount}}</span>
                </p>
            </div>
        </el-card>
        <el-card class="column-item ">
            <div class="column-item-1">
                <el-popover
                        placement="bottom"
                        width="200"
                        trigger="hover">
                    <div style="font-size: 12px">
                        <p>已完成报告数：所选时段内，所选医院的报告总完成数</p>
                        <div class="mg-t-8 clearfix">
                            <div class="fl">面积图：</div>
                            <div class="fl">
                                <p>所选时间段内的趋势图</p>
                                <p>选择时间段起止时间未跨月，按天数显示</p>
                                <p>选择时间段起止时间跨月未跨年，按月份显示</p>
                                <p>选择时间段起止时间跨年份，按年份显示</p>
                            </div>
                        </div>
                        <p class="mg-t-8">日均完成量：总完成报告数/所选时间段天数</p>
                        <p class="mg-t-8">今日报完成量：当前日期的完成报告数</p>
                    </div>
                    <span class="hover-icon" slot="reference">i</span>
                </el-popover>
                <p class="title color-gray">已完成报告数</p>
                <p class="num">{{cardsInfo['FINISHED'].totalCount}}</p>
                <div class="echartsBox" ref="finishedEcharts">

                </div>
            </div>
            <div class="column-item-3 clearfix">
                <p class="fl color-black">日均完成量：<span class="color2">{{cardsInfo['FINISHED'].dayAvg === 'NaN'? '-':Math.ceil(cardsInfo['FINISHED'].dayAvg * 10)/10}}</span>
                </p>
                <p class="fl color-black">今日完成量：<span class="color2">{{cardsInfo['FINISHED'].todayCount === 'NaN'? '-':cardsInfo['FINISHED'].todayCount}}</span>
                </p>
            </div>
        </el-card>
        <el-card class="column-item ">
            <div class="column-item-1">
                <el-popover
                        placement="bottom"
                        width="200"
                        trigger="hover">
                    <div style="font-size: 12px">
                        <p>报告失败总数：所选时段内，所选医院的报告总失败数</p>
                        <div class="mg-t-8 clearfix">
                            <div class="fl">柱状图：</div>
                            <div class="fl">
                                <p>所选时间段内的趋势图</p>
                                <p>选择时间段起止时间未跨月，按天数显示</p>
                                <p>选择时间段起止时间跨月未跨年，按月份显示</p>
                                <p>选择时间段起止时间跨年份，按年份显示</p>
                            </div>
                        </div>
                        <p class="mg-t-8">日均失败量：失败报告总数/所选时间段天数</p>
                        <p class="mg-t-8">今日失败量：当前日期的失败报告数</p>
                    </div>
                    <span class="hover-icon" slot="reference">i</span>
                </el-popover>
                <p class="title color-gray">报告失败总数</p>
                <p class="num">{{cardsInfo['FAILED'].totalCount}}</p>
                <div class="echartsBox" ref="failedEcharts">

                </div>
            </div>
            <div class="column-item-3 clearfix">
                <p class="fl color-black">日均失败量：<span class="color3">{{cardsInfo['FAILED'].dayAvg === 'NaN'? '-':Math.ceil(cardsInfo['FAILED'].dayAvg * 10)/10}}</span>
                </p>
                <p class="fl color-black">今日失败量：<span class="color3">{{cardsInfo['FAILED'].todayCount === 'NaN'? '-':cardsInfo['FAILED'].todayCount}}</span>
                </p>
            </div>
        </el-card>
        <el-card class="column-item">
            <div class="column-item-1">
                <el-popover
                        placement="bottom"
                        width="200"
                        trigger="hover">
                    <div style="font-size: 12px">
                        <p>被打回报告总数：所选时段内，所选医院的报告总被打回数</p>
                        <div class="mg-t-8 clearfix">
                            <div class="fl">折线图：</div>
                            <div class="fl">
                                <p>所选时间段内的趋势图</p>
                                <p>选择时间段起止时间未跨月，按天数显示</p>
                                <p>选择时间段起止时间跨月未跨年，按月份显示</p>
                                <p>选择时间段起止时间跨年份，按年份显示</p>
                            </div>
                        </div>
                        <p class="mg-t-8">日均被打回：被打回报告总数/所选时间段天数</p>
                        <p class="mg-t-8">今日被打回：当前日期的被打回报告数</p>
                    </div>
                    <span class="hover-icon" slot="reference">i</span>
                </el-popover>
                <p class="title color-gray">被打回报告总数</p>
                <p class="num">{{cardsInfo['REJECTED'].totalCount}}</p>
                <div class="echartsBox" ref="rejectedEcharts">

                </div>
            </div>
            <div class="column-item-3 clearfix">
                <p class="fl color-black">日均被打回：<span class="color4">{{cardsInfo['REJECTED'].dayAvg === 'NaN'? '-':Math.ceil(cardsInfo['REJECTED'].dayAvg * 10)/10}}</span>
                </p>
                <p class="fl color-black">今日被打回：<span class="color4">{{cardsInfo['REJECTED'].todayCount === 'NaN'? '-':cardsInfo['REJECTED'].todayCount}}</span>
                </p>
            </div>
        </el-card>
    </div>
</template>
<script>
    import API from '../../api/api_analysts_cards';
    import echarts from 'echarts';

    export default {
        name: 'statisticaAnalysisCards',
        props: ['filterData'],
        data() {
            return {
                cardsInfo: {
                    ALL: {},
                    FAILED: {},
                    FINISHED: {},
                    REJECTED: {}
                }, //卡片信息
                cardsLoading: false,
                periodType: 'DAY'
            }
        },
        mounted() {
            this.initViews();
        },
        watch: {
            filterData() {
                this.initViews();
            }
        },
        methods: {
            getCardsInfo() { //获取卡片基本信息， 如总报告数，周环比，日环比等
                API.getCardsInfo({
                    ...this.filterData,
                    recursiveLevel: this.filterData.isOnlySelf === 0?1000: 0,
                    states: ['ALL', 'FINISHED', 'FAILED', 'REJECTED'],
                }).then(data => {
                    this.cardsInfo = data;
                }).catch(_ => {
                    this.cardsLoading = false;
                })
            },
            getEchartsData() { //获取已完成报告数， 报告失败总数， 被打回报告总数的echarts数据
                return new Promise((resolve, reject) => {
//                    let {fromDate, toDate} = {...this.filterData};
//                    let diffIndex = 2;
//                    let diffFromDate = fromDate.split('/');
//                    let diffToDate = toDate.split('/');
//                    const periodMap = ['YEAR', 'MONTH', 'DAY'];
//                    for (let i = 0; i < diffFromDate.length; i++) {
//                        if (diffFromDate[i] !== diffToDate[i]) {
//                            diffIndex = i;
//                            break;
//                        }
//                    }
//                    this.periodType = periodMap[diffIndex];
                    API.getCardsEchartsInfo({
                        ...this.filterData,
                        recursiveLevel: this.filterData.isOnlySelf === 0?1000: 0,
//                        period: this.periodType,
                        states: ['FINISHED', 'FAILED', 'REJECTED'],
                    }).then(data => {
                        resolve(data);
                    }).catch(err => {
                        reject(err);
                    })
                });
            },
            async initViews() { //初始化整个卡片视图
                this.cardsLoading = true;
                this.getCardsInfo();
                let echartsData = await this.getEchartsData();
                this.periodType = echartsData.period
                this.cardsLoading = false;
                let xData = [],
                    yDataFinished = [],
                    yDataFailed = [],
                    yDataRejected = [];
                const actions = new Map([
                    ['default', () => null],
                    ['DAY', (item) => { xData.push(item.date); }],
                    ['MONTH', (item) => { xData.push(item.monthOfYear + '月'); }],
                    ['YEAR', (item) => { xData.push(item.year + '年'); }],
                ]);
                if (echartsData.statistics.length) {
                    echartsData.statistics.map(item => {
                        actions.get(this.periodType || 'default')(item);
                        yDataFinished.push(item.finishedCount);
                        yDataFailed.push(item.failedCount);
                        yDataRejected.push(item.rejectedCount);
                    });
                    this.drawFinishedEcharts(xData, yDataFinished);
                    this.drawFailedEcharts(xData, yDataFailed);
                    this.drawRejectedEcharts(xData, yDataRejected);
                }
            },
            //绘制已完成列表echarts
            drawFinishedEcharts(xData, yData) {
                let chartDom = this.$refs.finishedEcharts;
                let chart = null;
                if (chartDom) {
                    chart = echarts.init(chartDom);
                }
                let options = {
                    xAxis: {
                        type: 'category',
                        boundaryGap: false,
                        show: false,
                        data: xData
                    },
                    grid: {
                        left: 5,
                        top: 10,
                        right: 5,
                        bottom: 5
                    },
                    yAxis: {
                        type: 'value',
                        show: false,
                        axisPointer: {
                            show: false
                        }
                    },
                    tooltip: {
                        trigger: 'axis',
                        position: function (pt) {
                            return [pt[0], '10%'];
                        }
                    },
                    series: [{
                        data: yData,
                        type: 'line',
                        smooth: true,
                        symbol: yData.length > 1?'none': 'circle',
                        areaStyle: {
                            color: 'rgba(151,95,228,1)'
                        },
                        itemStyle: {
                            color: 'rgba(151,95,228,1)'
                        },
                        lineStyle: {
                            color: 'transparent'
                        }
                    }]
                };
                if (chart) chart.setOption(options);
            },
            //绘制报告失败图表echarts
            drawFailedEcharts(xData, yData) {
                let chartDom = this.$refs.failedEcharts;
                let chart = null;
                if (chartDom) {
                    chart = echarts.init(chartDom);
                }
                let options = {
                    xAxis: {
                        type: 'category',
                        show: false,
                        data: xData
                    },
                    grid: {
                        left: 0,
                        top: 10,
                        right: 0,
                        bottom: 5
                    },
                    tooltip: {
                        trigger: 'axis',
                        position: function (pt) {
                            return [pt[0], '10%'];
                        }
                    },
                    yAxis: {
                        type: 'value',
                        show: false
                    },
                    series: [{
                        data: yData,
                        type: 'bar',
                        itemStyle: {
                            color: '#3ba1ff'
                        }
                    }]
                };
                if (chart) chart.setOption(options);
            },
            //绘制被打回图表echarts
            drawRejectedEcharts(xData, yData) {
                let chartDom = this.$refs.rejectedEcharts;
                let chart = null;
                if (chartDom) {
                    chart = echarts.init(chartDom);
                }
                let options = {
                    xAxis: {
                        type: 'category',
                        show: false,
                        data: xData
                    },
                    grid: {
                        left: 0,
                        top: 10,
                        right: 0,
                        bottom: 5
                    },
                    tooltip: {
                        trigger: 'axis',
                        position: function (pt) {
                            return [pt[0], '10%'];
                        }
                    },
                    yAxis: {
                        type: 'value',
                        show: false,
                    },
                    series: [{
                        data: yData,
                        symbol: yData.length > 1?'none': 'circle',
                        type: 'line'
                    }]
                };
                if (chart) chart.setOption(options);
            }
        }
    }
</script>
<style scoped lang="scss">
    .table {
        & /deep/ .el-tabs__item {
            font-size: 16px;
        }

        .doctor-table /deep/ .el-tabs__item {
            font-size: 14px;
        }
    }

    .fl {
        float: left;
    }

    .m-r-10 {
        margin-right: 10px;
    }

    .m-r-14 {
        margin-right: 14px;
    }

    .clearfix:after {
        height: 0;
        content: '.';
        display: block;
        visibility: hidden;
        clear: both;
    }

    .color1 {
        color: #ff983e;
    }

    .color2 {
        color: #ff5b5b;
    }

    .color3 {
        color: #4910ff;
    }

    .color4 {
        color: #03cd12;
    }

    .query-item {
        margin: 20px 0 0;
    }

    .color-gray {
        color: #939393;
    }

    .color-black {
        color: #333;
    }

    .mg-t-8 {
        margin-top: 8px;
    }

    .statistical-column {
        display: flex;
        justify-content: space-between;

        .column-item {
            width: 23%;
            font-size: 14px;
            box-sizing: border-box;
            border: 1px solid #dedede;

            .column-item-1 {
                border-bottom: 1px solid #dedede;
                position: relative;

                .hover-icon {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    right: 0;
                    height: 18px;
                    width: 18px;
                    box-sizing: border-box;
                    border-radius: 50%;
                    border: 1px solid #979797;
                    color: #979797;
                    line-height: 18px;
                    text-align: center;
                }

                .num {
                    font-size: 35px;
                    letter-spacing: 1px;
                    color: #333;
                    height: 40px;
                    margin: 5px 0 0px;
                }

                .triangle1 {
                    width: 0px;
                    height: 0px;
                    margin-top: -5px;
                    border-top: 5px transparent solid;
                    border-left: 5px transparent solid;
                    border-right: 5px transparent solid;
                    border-bottom: 5px #8dd969 solid;
                }

                .triangle2 {
                    width: 0px;
                    height: 0px;
                    margin-top: 5px;
                    border-top: 5px #f5212c solid;
                    border-left: 5px transparent solid;
                    border-right: 5px transparent solid;
                    border-bottom: 5px transparent solid;
                }

                .column-item-2 {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

            }

            .column-item-4 {
                height: 70px;
                box-sizing: border-box;
                display: flex;
                justify-content: space-between;
            }

            .echartsBox {
                height: 70px;
                box-sizing: border-box;
            }

            .column-item-3 {
                text-align: center;
                margin-top: 10px;
                display: flex;
                justify-content: space-between;

                p {
                    text-align: left;
                }

            }
        }

        .column-item:last-child {
            margin-right: 0;
        }
    }

    .statistical-column .el-card, .el-message /deep/ {
        overflow: visible;
    }
</style>