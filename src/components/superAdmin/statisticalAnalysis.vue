<template>
    <div class="wrapper">
        <div class="statistica-analysis">
            <div class="query-item">
                <query-item :queryItems="queryItems" @handleReturnData="handleQuery"></query-item>
            </div>
            <statisticalAnalysisCards
                    :filterData="filterData"
            ></statisticalAnalysisCards>
            <div class="clearfix chart-table">
                <div class="chart fl item">
                    <p class="chart-title color-black"><span class="title-icon"></span>图表分析</p>
                    <ul class="chart-ul">
                        <li :class="{'li-active': activeChartIndex === index,'btn-hide': isHideTrendMap && index === 1}" v-for="(item, index) in chartBtns"
                            @click="handleChangeChart(index)">{{item}}
                        </li>
                    </ul>
                    <div style="position: relative">
                        <p v-show="isShowDoctorByHospital"
                           style="position: absolute;top: -13px;font-size: 14px;left: 0px;z-index: 1000;">
                            <span style="cursor: pointer;color: #0099ff;" @click="_loadData(2)">医生业务量统计</span>
                            <span>>{{hospitalName}}</span>
                        </p>
                        <div class="chart-content" ref="chartContent">

                        </div>
                    </div>
                </div>
                <div class="table fl item">
                    <el-tabs v-model="activeTableName" @tab-click="handleTableChange" class="doctor-table">
                        <el-tab-pane label="医生情况管理" name="0">
                            <el-tabs type="border-card" v-model="activeDoctorTable"
                                     @tab-click="handleDoctorTableChange">
                                <el-tab-pane label="上传医生" name="ROLE_UPLOADER"></el-tab-pane>
                                <el-tab-pane label="标注医生" name="ROLE_EDITOR"></el-tab-pane>
                                <el-tab-pane label="审核医生" name="ROLE_AUDITOR"></el-tab-pane>
                            </el-tabs>
                            <div class="doctor-table-tab-content">
                                <analysis-table :tableData="doctorTable" :queryData="filterDataDoctor"
                                                :pageSize="8"></analysis-table>
                            </div>
                        </el-tab-pane>
                        <el-tab-pane label="医院情况管理" name="1">
                            <analysis-table :tableData="hospitalTable" :queryData="filterDataTable"
                                            :pageSize="9"></analysis-table>
                        </el-tab-pane>
                    </el-tabs>

                </div>
            </div>
        </div>
    </div>
</template>
<script type="text/ecmascript-6">
    import API from "../../api/api_analysts_cards";
    import userAPI from "../../api/api_user";
    import axios from 'axios';
    import echarts from 'echarts';
    import Util from '../../common/util';
    import QueryItem from '../common/QueryItem.vue'
    import statisticalAnalysisCards from  './statisticalAnalysisCards';
    import AnalysisTable from './AnalysisTable.vue'
    export default {
        components: {
            QueryItem,
            AnalysisTable,
            statisticalAnalysisCards
        },
        data() {
            return {
                isHideTrendMap: false, // 控制是否隐藏增长趋势图，当没有时间的时候
                queryItems: [
                    {
                        type: 'tree',
                        model: {
                            key: 'institutionId',
                            value: Object.assign({}, JSON.parse(localStorage.getItem('access-user')), {id: JSON.parse(localStorage.getItem('access-user')).hospital_id})
                        },
                        label: '所属医院:',
                        data: () => {
                            return new Promise((resolve, reject) => {
                                userAPI.getInstitutions({
                                    showReportCount: false
                                }).then(res => {
                                    resolve(res);
                                })
                            });
                        }
                    },
                    {
                        type: 'checkBox',
                        model: {key: 'sumRecursive', value: []},
                        data: [{
                            value: 1,
                            label: '只看本院'
                        }]
                    },
//                    [Util.formatDate.format(new Date(),  'yy/MM/dd'), Util.formatDate.format(new Date(),  'yy/MM/dd')]
                    {
                        type: 'date',
                        model: {
                            key: 'date',
                            value: [Util.formatDate.format(new Date(),  'yy/MM/dd'), Util.formatDate.format(new Date(),  'yy/MM/dd')]
                        },
                    },
                    {
                        type: 'actions',
                        actions: [
                            {label: '重置', key: 'reset'}
                        ]
                    }
                ],
                doctorTable: {
                    settingData: [
                        {key: 'doctorNickName', label: '医生姓名', sortKey: 'NAME'},
                        {key: 'doctorHospital', label: '所属医院', sortKey: 'INSTITUTION'},
                        {key: 'hospitalCount', label: '服务机构', sortKey: 'SERVE_INSTITUTION'},
                        {key: 'workNum', label: '总完成量', sortKey: 'WORKLOAD'}
                    ],
                    loadFunction: (param)=> {
                        return new Promise((resolve, reject) => {
                            API.getDoctorStateApi(param).then(res => {
                                resolve(res);
                            })
                        });
                    }
                },
                hospitalTable: {
                    settingData: [
                        {key: 'institutionName', label: '医院名称', sortKey: 'NAME'},
                        {key: 'reportTotalCount', label: '总报告数', sortKey: 'REPORT_COUNT'},
                        {
                            key: 'count', label: '今日完成报告', sortKey: 'STATE_PROPORTION',
                            formatter: function (scope) {
                                return `${scope.row.stateCount}/${scope.row.count}`
                            }
                        }
                    ],
                    loadFunction: (param)=> {
                        return new Promise((resolve, reject) => {
                            API.getHospitalStateApi(param).then(res => {
                                resolve(res);
                            })
                        });
                    }
                },
                activeChartIndex: 0, // 当前显示的图表按钮
                chartBtns: ['报告状态', '增长趋势图', '医生业务量统计', '医院代理商报告统计'],
                activeDoctorTable: 'ROLE_UPLOADER',
                currentAllReport: [], // 当前时间段的总报告数，在报告状态图时得到，可以用于画趋势图
                filterData: {
                    institutionId: JSON.parse(localStorage.getItem('access-user')).hospital_id,
                    dataType: '',
                    isOnlySelf: 0,
//                    fromDate: '2017/04/05',
//                    toDate: '2019/05/01',
                    fromDate: Util.formatDate.format(new Date(), 'yy/MM/dd'),
                    toDate: Util.formatDate.format(new Date(), 'yy/MM/dd'),
                },
                hospitalName: '',
                isShowDoctorByHospital: false, // 是否显示医生业务量统计下的子图表的面包胥导航
                isOnlySelf: 0,
                filterDataDoctor: {},
                filterDataTable: {},
                chartData: {},
                activeTableName: 0 // 当前显示的table按钮
            }
        },
        created() {
            this.filterDataTable = Object.assign({}, this.filterData, {showChildren: this.isOnlySelf === 1 ? false : true})
            this.filterDataDoctor = Object.assign({}, this.filterDataTable, {userType: this.activeDoctorTable})
            this._loadData(this.activeChartIndex)
        },
        methods: {
            _chart0(params, index) {
                let sendArr = []
                if (this.isOnlySelf === 0) {
                    sendArr.push(
                            API.getOrganStateApi(Object.assign({}, params, {
                                sumRecursive: true,
                                recursiveLevel: 1
                            })),
                            API.getOrganStateApi(Object.assign({}, params, {
                                sumRecursive: false,
                                recursiveLevel: 0
                            }))
                    )
                } else {
                    sendArr.push(
                            API.getOrganStateApi(Object.assign({}, params, {
                                sumRecursive: false,
                                recursiveLevel: 0
                            }))
                    )
                }
                axios.all(sendArr)
                        .then(axios.spread((acct, perms) => {
                            let totalHospital = [], totalNum = 0
                            if (this.isOnlySelf === 0) { // 表示当前选择的不是只看本院
                                totalHospital = acct[0]
                                acct.splice(0, 1, perms[0])
                            } else {
                                totalHospital = acct[0]
                            }
                            let source = acct.map((v, i) => {
                                if (i > 0) {
                                    return [].concat(v.name + '（总代）', v.counts)
                                } else {
                                    return [].concat(v.name, v.counts)
                                }
                            })
                            source.unshift(['product', '已完成', '已审核', '审核中', '标注中', '分析完', '分析失败', '分析中', '待分析', '上传失败', '未上传'])
                            let arr = totalHospital.counts.map((v, i) => {
                                totalNum += v
                                return {
                                    value: v,
                                    name: source[0][i + 1]
                                }
                            })
                            let series = new Array(10).fill({type: 'bar'})
                            series.push({
                                type: 'pie',
                                center: ['90%', '15%'],
                                tooltip: {
                                    trigger: 'item',
                                    formatter: function (params, ticket, callback) {
                                        let proportion = null
                                        if (totalNum === 0) {
                                            proportion = 0
                                        } else {
                                            if (0 < (params.value / totalNum) < 0.0001) {
                                                proportion = '-'
                                            } else {
                                                proportion = (Math.round(((params.value / totalNum) || 0)* 10000)/100).toFixed(2)+'%'
                                            }
                                        }
                                        return `总数据：${totalNum}<br/>${params.name}数据:${params.value}<br/>占总数据比例：${proportion}`

                                    }
                                },
                                z: 100,
                                itemStyle: {
                                    normal: {
                                        label: {
                                            show: false
                                        },
                                        labelLine: {
                                            show: false
                                        }
                                    },

                                },
                                data: arr,
                                radius: '20%'
                            })
                            let legend = {
                                selected: {
                                    '分析失败': false,
                                    '分析中': false,
                                    '待分析': false,
                                    '上传失败': false,
                                    '未上传': false
                                }
                            }
                            this._initChart(source, series, legend, [], {}, 3, '22%')
                        }))
            },
            _chart1(params, index) {
                let sendArr = [], param = params
                if (this.isOnlySelf === 0) {
                    let date = this._trendChartTime(this.filterData.fromDate, this.filterData.toDate)
                    sendArr.push(
                            API.getOrganStateApi(Object.assign({}, params, {sumRecursive: true, recursiveLevel: 1})),
                            API.getOrganStateApi(Object.assign({}, params, {sumRecursive: false, recursiveLevel: 0})),
                            API.getOrganStateApi(Object.assign({}, params, {
                                sumRecursive: true,
                                recursiveLevel: 1
                            }, date)),
                            API.getOrganStateApi(Object.assign({}, params, {
                                sumRecursive: false,
                                recursiveLevel: 0
                            }, date))
                    )
                } else {
                    sendArr.push(
                            API.getOrganStateApi(Object.assign({}, params, {sumRecursive: false, recursiveLevel: 0})),
                            API.getOrganStateApi(Object.assign({}, params, {
                                sumRecursive: false,
                                recursiveLevel: 0
                            }, this._trendChartTime(this.filterData.fromDate, this.filterData.toDate)))
                    )
                }
                axios.all(sendArr)
                        .then(axios.spread((data1, data2, data3, data4) => {
                            let data = [], series = []
                            if (this.isOnlySelf === 0) {
                                data1.splice(0, 1, data2[0])
                                data3.splice(0, 1, data4[0])
                            }
                            let source = data1.map((v, i) => {
                                if (this.isOnlySelf === 0) {
                                    if (i > 0) {
                                        return [].concat(v.name + '（总代）', v.counts, data3[i].counts)
                                    } else {
                                        return [].concat(v.name, v.counts, data3[i].counts)
                                    }
                                } else {
                                    if (i > 0) {
                                        return [].concat(v.name + '（总代）', v.counts, data2[i].counts)
                                    } else {
                                        return [].concat(v.name, v.counts, data2[i].counts)
                                    }
                                }
                            })
                            source.unshift(['product', '时间内增长量', '时间前总量'])
                            series = new Array(2).fill({type: 'line', areaStyle: {},symbolSize: data1.length === 1?10:6,symbol:'circle'})
                            this._initChart(source, series, {}, [], {boundaryGap: false})
                        }))
            },
            _chart2(params, index) {
                API.getDoctorApi(Object.assign({}, params, {
                    sumRecursive: false,
                    recursiveLevel: this.isOnlySelf === 0 ? 1 : 0
                })).then((data) => {
                    let source = data.map((v, i) => {
                        let doctors = v.userTypesReportCount.map((v1, i1) => {
                            return [].concat(v1.v)
                        })
                        return [].concat(v.institutionName, doctors)
                    })
                    source.unshift(['product','上传医生', '标注医生', '审核医生'])
                    let series = new Array(3).fill({type: 'bar'})
                    this._initChart(source, series, {}, data)
                })
            },
            _chart3(params, index) {
                let sendArr = []
                if (this.isOnlySelf === 0) {
                    sendArr.push(
                            API.getOrganStateApi(Object.assign({}, params, {
                                sumRecursive: true,
                                recursiveLevel: 1
                            })),
                            API.getOrganStateApi(Object.assign({}, params, {
                                sumRecursive: false,
                                recursiveLevel: 0
                            }))
                    )
                } else {
                    sendArr.push(
                            API.getOrganStateApi(Object.assign({}, params, {
                                sumRecursive: false,
                                recursiveLevel: 0
                            }))
                    )
                }
                axios.all(sendArr)
                        .then(axios.spread((acct, perms) => {
                            if (this.isOnlySelf === 0) { // 表示当前选择的不是只看本院
                                acct.splice(0, 1, perms[0])
                            }
                            let source = acct.map((v, i) => {
                                let inProcess = v.counts.reduce((a, b)=> {
                                    return a - b;
                                })
                                if (i > 0) {
                                    return [].concat(v.name + '（总代）', v.counts, [inProcess])
                                } else {
                                    return [].concat(v.name, v.counts, [inProcess])
                                }
                            })
                            let legend = {
                                data: ['总报告数', '已完成', '失败数', '进程中'],
                                icon: "circle",   //  这个字段控制形状  类型包括 circle，rect ，roundRect，triangle，diamond，pin，arrow，none
                                itemWidth: 10,  // 设置宽度
                                itemHeight: 10, // 设置高度
                                itemGap: 40 // 设置间距
                            }
                            source.unshift(['product', '总报告数', '已完成', '失败数', '进程中'])
                            let arr = new Array(3).fill('1')
                            let series = arr.map((v, i) => {
//                                let y1 = i === 0 ? '已完成' : (i === 1 ? '失败数' : '进程中')
                                return {type: 'line', symbol:'circle',symbolSize: 6,encode: {x: 'product', y: i+2, tooltip: i+2, seriesName: i+2}}
                            })
                            series.push({
                                type: 'bar',
                                label: {
                                    formatter: '{b}: {@总报告数}{d}'
                                },
                                encode: {
                                    seriesName: 1,
                                    tooltip: 1,
                                    x: 'product',
                                    y: '总报告数'
                                }
                            })
                            this._initChart(source, series, legend)
                        }))
            },
            _drawDoctorByHospitalChart(data) {
                var myChart = echarts.init(this.$refs['chartContent']);
                myChart.off('click')
                myChart.clear()
                let arr = data.institutionDataList.map((v, i) => {
                    return Object.assign({}, v, {stack: 'data', type: 'bar'})
                })
                let option = option = {
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                            type: 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
                        }
                    },
                    legend: {
                        bottom: 40
                    },
                    grid: {
                        bottom: '18%',
                        top:'4%',
                        containLabel: true,
                        left: 0,
                        right: '3%'
                    },
                    xAxis: [
                        {
                            type: 'category',
                            axisLabel: {
                                clickable: true,
                                formatter: function (params, index) {
                                    if (params && params.length > 7) {
                                        params = params.slice(0, 6) + '...'
                                    }
                                    return params;
                                },
                                rotate: 30,
                            },
                            data: data.doctorList
                        }
                    ],
                    yAxis: [
                        {
                            type: 'value',
                            boundaryGap: ['0%', '10%']
                        }
                    ],
                    dataZoom: [
                        {
                            type: 'slider',
                            realtime: true, //拖动滚动条时是否动态的更新图表数据
                            height: 20,//滚动条高度
                            startValue: 0,//滚动条开始位置
                            endValue: 12//结束位置
                        },
                        {   // 这个dataZoom组件，也控制x轴。
                            type: 'inside', // 这个 dataZoom 组件是 inside 型 dataZoom 组件
                            startValue: 0,//滚动条开始位置
                            endValue: 12//结束位置
                        }
                    ],
                    series: arr
                };
                myChart.setOption(option)
            },
            // 开始画图
            _initChart(source, series, legend = {}, data = [], xAxis = {}, endValue = 5, bottom = '14%') {
                var dom = this.$refs['chartContent'];
                var myChart = echarts.init(dom);
                myChart.clear()
                let option = null;
                option = {
                    legend: Object.assign({}, legend, {bottom: 40}),
                    tooltip: {showContent: true, trigger: 'axis'},
                    dataset: {
                        source: source
                    },
                    grid: {
                        top: '4%',
                        left: 0,
                        right: 0,
                        containLabel: true,
                        bottom: bottom
                    },
                    xAxis: {
                        ...xAxis,
                        type: 'category',
                        axisLabel: {
                            formatter: function (params, index) {
                                if (params && params.length > 7) {
                                    params = params.slice(0, 6) + '...'
                                }
                                return params;
                            },
                            rotate: 30
                        }
                    },
                    yAxis: {
                        boundaryGap: this.activeChartIndex === 0?['0', '60%']: ['0', '5%'],
                        axisLabel: {
                            formatter: '{value}(份)'
                        },
                        type: 'value'
                    },
                    series: series,
                    dataZoom: [
                        {
                            type: 'slider',
                            realtime: true, //拖动滚动条时是否动态的更新图表数据
                            height: 20,//滚动条高度
                            startValue: 0,//滚动条开始位置
                            endValue: endValue//结束位置
                        },
                        {   // 这个dataZoom组件，也控制x轴。
                            type: 'inside', // 这个 dataZoom 组件是 inside 型 dataZoom 组件
                            startValue: 0,//滚动条开始位置
                            endValue: endValue//结束位置
                        }
                    ]
                }
                if (option && typeof option === "object") {
                    myChart.setOption(option, true);
                }
                this.chartData[this.activeChartIndex] = {
                    source: source,
                    series: series,
                    legend: legend,
                    data: data,
                    xAxis: xAxis,
                    endValue: endValue,
                    bottom: bottom
                }
                if (this.activeChartIndex === 2) {
                    myChart.off('click');
                    let that = this
                    myChart.on('click','series', function (params) {
                        let param = {
                            fromDate: that.filterData.fromDate,
                            institutionId: data[params.dataIndex].institutionId,
                            toDate: that.filterData.toDate,
                            userType: params.seriesIndex === 0 ? 'ROLE_UPLOADER' : (params.seriesIndex === 1 ? 'ROLE_EDITOR' : 'ROLE_AUDITOR')
                        }
                        API.getDoctorByHospitalApi(param).then((result) => {
                            that.isShowDoctorByHospital = true
                            that.hospitalName = data[params.dataIndex].institutionName
                            that._drawDoctorByHospitalChart(result)
                        })
                    });
                } else {
                    myChart.off('click');
                }
            },
            // 当显示趋势图时，得到另一个时间段的时间
            _trendChartTime(startT, endT) {
                let distance_days = Util.calcTimeDayLength(startT, endT)
                let preStartDate = new Date(new Date(startT).getTime() - 24*60*60*1000)
                let arr = Util.calcShortCuts(distance_days, preStartDate)
                let data = {
                    fromDate: Util.formatDate.format(arr[0], 'yy/MM/dd'),
                    toDate: Util.formatDate.format(arr[1], 'yy/MM/dd')
                }
                return data
            },
            _loadData(index) {
                let params = null
                switch (index) {
                    case 0:
                        params = Object.assign({}, this.filterData, {states: ['FINISH', 'AUDIT_PASS', 'AUDITING', 'EDITING', 'WAIT_FOR_EDIT', 'ANALYZE_FAILED', 'ANALYZING', 'WAIT_FOR_ANALYZE', 'UPLOAD_FAILED', 'INITIAL']})
                        this._chart0(params, index)
                        break;
                    case 1:
                        params = Object.assign({}, this.filterData, {states: ['ALL_STATES']})
                        this._chart1(params, index)
                        break;
                    case 2:
                        params = Object.assign({}, this.filterData, {userType: ['ROLE_UPLOADER', 'ROLE_EDITOR', 'ROLE_AUDITOR']})
                        this.isShowDoctorByHospital = false
                        this._chart2(params, index)
                        break;
                    case 3:
                        params = Object.assign({}, this.filterData, {states: ['ALL_STATES', 'FINISH', 'FAILED_STATES']})
                        this._chart3(params, index)
                        break;

                }
            },
            handleChangeChart(index) {
                this.activeChartIndex = index
                if (this.isShowDoctorByHospital) {
                    this.isShowDoctorByHospital = false
                }
                if (this.chartData[index]) {
                    this._initChart(this.chartData[index].source, this.chartData[index].series, this.chartData[index].legend, this.chartData[index].data, this.chartData[index].xAxis, this.chartData[index].endValue, this.chartData[index].bottom)
                    return
                }
                this._loadData(index)
            },
            handleTableChange() {
                if (this.activeTableName === 1) {
                    this.filterDataTable = Object.assign({}, this.filterData, {showChildren: this.isOnlySelf === 1 ? false : true})
                }
            },
            handleDoctorTableChange() {
                this.filterDataDoctor = Object.assign({}, this.filterData, {
                    showChildren: this.isOnlySelf === 1 ? false : true,
                    userType: this.activeDoctorTable
                })
            },
            handleQuery(val) {
                this.isOnlySelf = val.sumRecursive[0] || 0
                let obj = {};
                ({institutionId: {id:obj.institutionId}, sumRecursive:[obj.isOnlySelf = 0]} = val);
                if (val.date) {
                    this.isHideTrendMap = false;
                    ({date:[obj.fromDate, obj.toDate]}= val)
                } else {
                    if (this.activeChartIndex === 1) {
                        this.activeChartIndex = 0
                    }
                    this.isHideTrendMap = true
                }
                this.filterData = obj;
                this.filterDataTable = Object.assign({}, this.filterData, {showChildren: this.isOnlySelf === 1 ? false : true})
                this.filterDataDoctor = Object.assign({}, this.filterDataTable, {userType: this.activeDoctorTable})
                this.chartData = {}
                this._loadData(this.activeChartIndex)
            }
        }
    }
</script>
<style type="text/css" scoped lang="scss">
    .wrapper {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        /*background: #e4e4e4;*/
    }
    .btn-hide {display: none !important;}
    .statistica-analysis {
        background: #ffffff;
        margin: 10px auto 0 auto;
        width: 1400px;
        overflow: hidden;
        padding: 0 20px;

    .fl {
        float: left;
    }

    .clearfix:after {
        height: 0;
        content: '.';
        display: block;
        visibility: hidden;
        clear: both;
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

    .m-r-10 {
        margin-right: 10px;
    }

    .m-r-14 {
        margin-right: 14px;
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

    .chart-table {
        margin-top: 20px;

    .item {
        width: 48.666%;
        height: 595px;
        padding: 0px 20px 0;
        box-sizing: border-box;
        border: 1px solid #dedede;
    }

    }
    .chart {
        margin-right: 2.666%;

    .chart-title {
        font-size: 16px;
        line-height: 40px;

    .title-icon {
        height: 18px;
        line-height: 40px;
        width: 5px;
        vertical-align: middle;
        margin-right: 10px;
        display: inline-block;
        background: #0099ff;
    }

    }
    .chart-ul {
        font-size: 0;
        margin: 10px 0 20px;

    li {
        background: #73d13d;
        font-size: 14px;
        cursor: pointer;
        display: inline-block;
        color: #ffffff;
        border-radius: 5px;
        margin-right: 30px;
        line-height: 34px;
        padding: 0 10px;
    }

    .li-active {
        background: #0099ff;
    }

    }
    .chart-content {
        width: 100%;
        box-sizing: border-box;
        height: 480px;
    }

    }
    .table {

    &
    /deep/
    .el-tabs__item {
        font-size: 16px;
    }

    .doctor-table /deep/ .el-tabs__item {
        font-size: 14px;
    }

    .doctor-table /deep/ {

    .el-tabs--border-card {
        border-bottom: none;
    }

    .el-tabs--border-card > .el-tabs__content {
        padding: 0;
    }

    }
    .doctor-table-tab-content {
        border-left: 1px solid #dedede;
        border-right: 1px solid #dedede;
        border-bottom: 1px solid #dedede;
    }

    }
    }
</style> 