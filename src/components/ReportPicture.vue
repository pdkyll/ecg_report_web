<template>
    <div class="picBox" v-loading="loading">
        <el-dialog :visible.sync="showEcgPart" width="950px" v-if="showEcgPart">
            <div class="fixToolTip">
                <div style="width: 384px; margin: 0 auto">
                    <span style="margin-right: 20px">第{{pageData.index}}页/共{{pageData.num}}页</span>
                    <el-checkbox v-model="tooltipCheck"
                                 @change="showChange(position, abnormalType, type, null, true)">
                    <span style="color: #fff">
                     使用该图
                    </span>
                    </el-checkbox>
                    <el-button type="primary" size="small" @click="pageUp" :disabled="pageUpDisabled">上一个
                    </el-button>
                    <el-button type="primary" size="small" @click="pageDown" :disabled="pageDownDisabled">下一个
                    </el-button>
                </div>

            </div>
            <EcgPart
                    :position="position"
                    :label="label"
                    :type="type"
                    :rate="rate"
                    @changeAdds="changeAdds"
            />
        </el-dialog>
        <h5>报告用图选择</h5>
        <div class="operateBox" v-if="showData.length == 0">
            <div class="singleBox">
                <p>暂无数据</p>
            </div>
        </div>
        <div class="operateBox" v-if="showData.length > 0">
            <div class="singleBox" v-for="(list, index) in showData" @click="changeSelect(index)">
                <p style="font-size: 12px">{{list.name}}</p>
                <p>共{{list.num}}</p>
                <p>已选{{list.checkedNum}}</p>
            </div>
        </div>
        <div class="listBox" v-loading="listDataLoading" v-if="hackResetList">
            <div :data-index="selectIndex" v-for="(listInfo,index) in listData.data"
                 @mouseenter="changeShowEcgPartData(listInfo.position, listInfo.type, listInfo.label, listInfo.datetime, index, false, listInfo.rate)"
                 @mouseleave="clearSelectIndex"
            >
                <el-tooltip placement="left" effect="light" :enterable="false" :open-delay="300">
                    <div slot="content" v-if="selectTooltipIndex === index" class="showTooltipBox"
                         :style="{width: toolTipWidth + 'px', height:toolTipHeight + 'px'}">
                        <EcgPart
                                :fromTooltip="true"
                                :position="showEcgPartData.position"
                                :type="showEcgPartData.type"
                                :label="showEcgPartData.label"
                                :toolTipHeight="toolTipHeight"
                                :rate="showEcgPartData.rate"
                        />
                    </div>
                    <div class="list">
                        <div class="clickBox"
                             @click="showChange(listInfo.position, listData.abnormalType, listInfo.type, null, true)"></div>
                        <div class="checkBox">
                            <el-checkbox-group v-model="checkList">
                                <el-checkbox :label="listInfo.position"
                                             @change="showChange(listInfo.position, listData.abnormalType, listInfo.type)"></el-checkbox>
                            </el-checkbox-group>
                            <span class="label">使用该图</span>
                        </div>
                        <div class="showInfo">
                            <div class="infos" :class="selectToolIndex=== index && showHightLight?'boldText':''">
                                <p class="infoBox">
                                    <span class="leftWords">{{listInfo.showLabel?listInfo.showLabel:listInfo.label}}<span
                                            v-if="listInfo.rate">({{listInfo.rate}}bpm)</span>
                                        <span v-if="listInfo.mm_per_mv && listInfo.mm_per_mv !== 10" style="font-size: 14px">({{listInfo.mm_per_mv}}mm/mv)</span>
                                    </span>
                                    <!--<span class="leftWords">{{listInfo.averXL}}</span>-->
                                </p>
                                <p class="infoBox">
                                    <span>{{listInfo.datetime}}</span>
                                    <span v-if="listInfo.hint" class="describeInfo">({{listInfo.hint}})</span>
                                </p>
                            </div>
                        </div>
                        <div class="showButton">
                            <el-button size="small" type="primary"
                                       @click="jumpToEcgPos(listInfo.position)">
                                查看原图
                            </el-button>
                            <el-button size="small" type="primary"
                                       v-if="!listInfo.showLabel"
                                       @click="changeShowEcgPart(listInfo.position, listInfo.type, listInfo.label, listInfo.datetime, listData.abnormalType, listInfo.rate)">
                                点击预览
                            </el-button>
                            <el-button size="small" type="primary"
                                       v-if="listInfo.showLabel"
                                       @click="changeShowEcgPart(listInfo.position, listInfo.type, listInfo.showLabel, listInfo.datetime, listData.abnormalType, listInfo.rate)">
                                点击预览
                            </el-button>
                        </div>
                    </div>
                </el-tooltip>
            </div>
        </div>
        <div class="pagenation">
            <el-pagination
                    background
                    v-if="hackReset"
                    layout="prev, pager, next"
                    :currentPage="pageData.index"
                    @current-change="changePageSise"
                    :page-count="pageData.num">
            </el-pagination>
        </div>
    </div>
</template>
<script>
    import EcgPart from './EcgPart.vue';
    import {bus} from '../bus';
    import API from '../api/api_report';
    import {mapState, mapMutations, mapActions} from 'vuex'
    import Util from '../common/util';

    export default {
        name: 'ReportPicture',
        components: {
            EcgPart
        },
        data() {
            return {
                tooltipCheck: false,
                listData: {
                    data: [],
                    name: '',
                    abnormalType: ''
                },
                showEcgPart: false,
                checkList: [],
                selectIndex: 0,
                pageObj: [],
                pageData: {
                    index: 1,
                    num: 1
                },
                listDataLoading: false,
                hackReset: true,
                showData: [],
                pageLength: 5,
                loading: false,
                perListData: {
                    abnormal_name: '',
                    report_id: '',
                    start: 0,
                    limit: 5
                },
                showEcgPartData: {
                    type: '',
                    label: '',
                    position: -1
                },
                position: '',
                label: '',
                type: '',
                rate: '',
                add: 10,
                abnormalType: '',
                selectTooltipIndex: -1,
                selectToolIndex: -1,
                pageDownDisabled: false,
                pageUpDisabled: false,
                toolTipWidth: 550,
                toolTipHeight: 860,
                showHightLight: true,
                hackResetList: true
            }
        },
        created() {
            bus.$off('getUsePicData');
            bus.$on('getUsePicData', () => {
                this.getUsePicData();
            });
            this.getUsePicData();
            this.perListData.report_id = this.reportId;
        },
        mounted() {
        },
        computed: {
            reportId() {
                return localStorage.getItem('report_id')
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeInPic',
                'changeSelectComponent'
            ]),
            closeEcgPart() {
                this.showEcgPart = false;
            },
            changeAdds(add) {
                let curIndex = this.selectToolIndex;
                this.listData.data[curIndex].mm_per_mv = Number(add);
                this.hackResetList = false;
                this.$nextTick(() => {
                    this.hackResetList = true;
                })
            },
            changePageButtonDisabled() {
                let num = this.pageData.num;
                let index = this.pageData.index;
                let curIndex = this.selectToolIndex + 1;
                let totalLength = this.listData.data.length;
                if (index < num) {
                    this.pageDownDisabled = false;
                    if (index === 1) {
                        this.pageUpDisabled = curIndex === 1;
                    } else {
                        this.pageUpDisabled = false;
                    }
                } else {
                    if (index === num) {
                        this.pageUpDisabled = curIndex === 1;
                    } else {
                        this.pageUpDisabled = false;
                    }
                    this.pageDownDisabled = curIndex === totalLength;
                }
                if (index > 1) {
                    this.pageUpDisabled = false;
                }
                if (index === 1 && num === 1 && totalLength === 1) {
                    this.pageUpDisabled = true;
                    this.pageDownDisabled = true;
                }
            },
            clearSelectIndex() {
                this.selectTooltipIndex = -1;
                // this.selectToolIndex = -1;
                this.showHightLight = false;
            },
            changeShowEcgPartData(position, abnormalType, label, time, index, noChangeTooltipIndex = false, rates) {
                let height = document.documentElement.clientHeight;
                let per = 860 / 969;
                let rate = 550 / 860;
                let newHeight = height * per;
                let newWidth = newHeight * rate;
                this.showHightLight = true;
                this.toolTipWidth = newWidth;
                this.toolTipHeight = newHeight;
                if (noChangeTooltipIndex) {
                    this.selectToolIndex = index;
                } else {
                    this.selectTooltipIndex = index;
                    this.selectToolIndex = index;
                }
                this.changePageButtonDisabled();
                this.tooltipCheck = this.checkList.indexOf(position) !== -1;
                this.showEcgPartData = {
                    ...this.showEcgPartData,
                    type: label,
                    label: abnormalType,
                    position: position,
                    rate: rates
                }

            },
            pageChange(obj, up = true) {
                let add = up ? -1 : 1;
                let temp = up ? this.listData.data.length + add : 0;
                this.pageData = {
                    ...this.pageData,
                    index: this.pageData.index + add
                };
                this.changeData(this.pageData.index, () => {
                    obj = this.listData.data[temp];
                    this.selectToolIndex = temp;
                    this.position = obj.position;
                    this.label = obj.type;
                    this.type = obj.label;
                    this.tooltipCheck = this.checkList.indexOf(this.position) !== -1;
                    this.changePageButtonDisabled();
                });
            },
            pageUp() {
                this.showHightLight = true;
                let num = this.pageData.num;
                let index = this.pageData.index;
                let curIndex = this.selectToolIndex + 1;
                let totalLength = this.listData.data.length;
                let obj = null;
                if (index < num) {
                    if (index === 1) {
                        if (curIndex !== 1 && curIndex <= totalLength) {
                            obj = this.listData.data[curIndex - 2];
                            this.selectToolIndex = curIndex - 2;
                            this.position = obj.position;
                            this.label = obj.type;
                            this.type = obj.label;
                            this.rate = obj.rate;
                        }
                    } else {
                        if (curIndex === 1) {
                            this.pageChange(obj, true);
                        } else {
                            obj = this.listData.data[curIndex - 2];
                            this.selectToolIndex = curIndex - 2;
                            this.position = obj.position;
                            this.label = obj.type;
                            this.type = obj.label;
                            this.rate = obj.rate;
                        }
                    }
                } else {
                    if (curIndex === 1) {
                        this.pageChange();
                    } else {
                        obj = this.listData.data[curIndex - 2];
                        this.selectToolIndex = curIndex - 2;
                        this.position = obj.position;
                        this.label = obj.type;
                        this.type = obj.label;
                        this.rate = obj.rate;
                    }
                }
                this.tooltipCheck = this.checkList.indexOf(this.position) !== -1;
                this.changePageButtonDisabled();
            },
            pageDown() {
                this.showHightLight = true;
                let num = this.pageData.num;
                let index = this.pageData.index;
                let curIndex = this.selectToolIndex + 1;
                let totalLength = this.listData.data.length;
                if (index <= num) {
                    let obj = null;
                    if (curIndex < totalLength) {
                        obj = this.listData.data[curIndex];
                        this.selectToolIndex = curIndex;
                        this.position = obj.position;
                        this.label = obj.type;
                        this.type = obj.label;
                        this.rate = obj.rate;
                    } else if (curIndex === totalLength) {
                        this.pageChange(obj, false);
                    }
                }
                this.tooltipCheck = this.checkList.indexOf(this.position) !== -1;
                this.changePageButtonDisabled();
            },
            jumpToEcgPos(pos) {
                this.$parent.$parent.tabSelect = '1';
                this.$parent.$parent.changeShowComponent({position: pos, statu: true})
            },
            changeData(page, callback = null) {
                let start = (page - 1) * this.pageLength;
                this.perListData.start = start;
                this.listDataLoading = true;
                this.getPageData(callback);
            },
            changePageSise(page) {
//                this.pageObj[this.selectIndex].pageIndex = page;
                this.pageData = {
                    ...this.pageData,
                    index: page
                };
                this.changeData(page);
            },
            changeSelect(index) {
                this.closeEcgPart();
                $('.singleBox').removeClass('selected');
                $('.singleBox').eq(index).addClass('selected');
                let pageNum = Math.ceil(this.showData[index].num / this.pageLength);
                this.perListData.abnormal_name = this.showData[index].abnormalName;
                this.listData.name = this.showData[index].name;
                this.listData.abnormalType = this.showData[index].abnormalType;
                this.perListData.start = 0;
                this.pageData = {
                    index: 1,
                    num: pageNum
                };
                this.selectIndex = index;
                this.listDataLoading = true;
                this.getPageData();
                this.hackReset = false;
                this.$nextTick(() => {
                    this.hackReset = true;
                })
            },
            getPageData(callback = null) {
                let checkList = [];
                API.getPicListData(this.perListData).then(data => {
                    let listAsyncData = [];
                    for (let i = 0; i < data.length; i++) {
                        if (data[i].checked) {
                            checkList.push(data[i].position);
                        }
                        let label = data[i].title || data[i].label;

                        let params = {
                            position: data[i].position,
                            label: Util.rhythmTranslateMap[label] || label,
                            type: data[i].label,
                            datetime: data[i].datetime,
                            checked: data[i].checked,
                            mm_per_mv: data[i].mm_per_mv,
                            rate: data[i].rate || undefined,
                            hint: data[i].hint
                        };
                        if (label === 'LRR') {
                            params = {
                                ...params,
                                showLabel: '长RR间期(' + Math.round(data[i].length / 512 * 1000) + 'ms)',
                            };
                        }
                        listAsyncData.push(params);
                    }
                    this.listData.data = listAsyncData;
                    this.checkList = checkList;
                    this.$nextTick(() => {
                        this.loading = false;
                        this.listDataLoading = false;
                        $('.singleBox').eq(this.selectIndex).addClass('selected');
                        if (callback) callback();
                    })
                }).catch(() => {
                    this.loading = false;
                    this.listDataLoading = false;
                });
            },
            getUsePicData() {
                this.loading = true;
                API.getPicList({
                    report_id: this.reportId,
                }).then(data => {
                    let showTemp = [];
                    for (let v in data) {
                        showTemp.push({
                            name: data[v].label,
                            num: data[v].total_count,
                            checkedNum: data[v].checked_count,
                            abnormalName: v,
                            weight: data[v].weight,
                            abnormalType: data[v].abnormal_type
                        });
                    }
                    showTemp.sort((a, b) => a.weight - b.weight);
                    this.showData = showTemp;
                    if (showTemp[this.selectIndex] === undefined) {
                        this.changeSelect(0);
                    }
                    this.pageData.num = Math.ceil(showTemp[this.selectIndex].num / this.pageLength);
                    this.perListData.abnormal_name = showTemp[this.selectIndex].abnormalName;
                    this.listData.name = showTemp[this.selectIndex].name;
                    this.listData.abnormalType = showTemp[this.selectIndex].abnormalType;
                    this.getPageData();
                }).catch(() => {
                    this.loading = false;
                    this.listDataLoading = false;
                })
            },
            changeShowEcgPart(position, abnormalType, label, time, listDataAbnormal, rate) {
                this.selectTooltipIndex = -1;
                this.position = position;
                this.label = abnormalType;
                this.type = label;
                this.rate = rate;
                this.tooltipCheck = this.checkList.indexOf(this.position) !== -1;
                this.abnormalType = listDataAbnormal;
                this.showEcgPart = true;
            },
            resetList() {
                this.hackResetList = false;
                this.$nextTick(() => {
                    this.hackResetList = true;
                })
            },
            showChange(val, abnormalType, label, add = 10, fromToolTip = false) {
                let checked = false;
                let tempIndex = 0;
                if (fromToolTip) {
                    val = this.listData.data[this.selectToolIndex].position;
                    label = this.listData.data[this.selectToolIndex].type;
                    let index = this.checkList.indexOf(val);
                    if (index !== -1) {
                        this.checkList.splice(index, 1);
                        checked = true;
                    } else {
                        this.checkList.push(val);
                    }
                } else {
                    for (let i = 0; i < this.listData.data.length; i++) {
                        let temp = this.listData.data[i];
                        if (temp.position === val) {
                            tempIndex = i;
                            if (temp.checked) checked = true;
                            break;
                        }
                    }
                }
                this.changeInPic(true);
                if (checked) {
                    API.changeSelectPic({
                        report_id: this.reportId,
                        abnormal_type: abnormalType,
                        position: val,
                        label: label,
                    }).then(data => {
                        this.listData.data[tempIndex].checked = false;
                        this.showData[this.selectIndex].checkedNum--;
                    }).catch(() => {
                        this.loading = false;
                        this.listDataLoading = false;
                        this.checkList.push(val);
//                       this.$message.error()
                    })
                } else {
                    API.changeSelectPic({
                        report_id: this.reportId,
                        abnormal_type: abnormalType,
                        position: val,
                        state: 1,
                        label: label,
                        mm_per_mv: Number(add) || 10
                    }).then(data => {
                        this.listData.data[tempIndex].checked = true;
                        this.showData[this.selectIndex].checkedNum++;
                    }).catch(() => {
                        this.loading = false;
                        this.listDataLoading = false;
                        this.checkList.splice(this.checkList.indexOf(val), 1);
                    })
                }

            }
        }
    }
</script>
<style>
    .list .el-checkbox__label {
        position: absolute;
        width: 60px;
        opacity: 0;
        z-index: 99;
    }

    .el-tooltip__popper {
        padding: 0;
    }
</style>
<style scoped lang="scss">
    .describeInfo {
        color: #ff0619;
    }
    .picBox {
        box-sizing: border-box;
        padding: 0 10px 20px 10px;
        width: 582px;
        margin-top: 11px;
        text-align: left;
        border: 1px solid #000;
    }

    .fixToolTip {
        position: fixed;
        overflow: hidden;
        z-index: 9999;
        box-sizing: border-box;
        padding: 20px 200px;
        width: 100%;
        bottom: 0;
        left: 0;
        background-color: #3b5fff;
        color: #fff;
    }

    h5 {
        line-height: 30px;
    }

    .operateBox {
        box-sizing: border-box;
        border: 1px solid #000;
        padding: 6px;
        width: 556px;
        /*overflow-x: scroll;*/
        /*white-space: nowrap;*/
        .singleBox {
            display: inline-block;
            width: 80px;
            height: 80px;
            cursor: pointer;
            box-sizing: border-box;
            padding: 10px 0;
            text-align: center;
            background: #ebebeb;
            color: #999;
            font-size: 14px;
            margin: 0 10px 10px 0;
            vertical-align: bottom;
        }

        .selected {
            border: 1px dashed #ff0312;
            color: #000;
        }
    }

    .listBox {
        width: 100%;
        height: 430px;
        margin-top: 10px;

        .list {
            box-sizing: border-box;
            padding: 0 30px 0 10px;
            position: relative;
            width: 556px;
            height: 73px;
            font-size: 14px;
            border: 1px solid #000;
            margin-top: 10px;

            .checkBox {
                position: absolute;
                z-index: 99;
                display: flex;
                justify-content: space-around;
                align-items: center;
                float: left;
                margin-top: 25px;

                .label {
                    position: relative;
                    top: -1px;
                    display: inline-block;
                    padding-left: 6px;
                }
            }

            .showInfo {
                position: absolute;
                z-index: 2;
                left: 110px;
                height: 100%;
                display: flex;
                justify-content: space-around;
                align-items: center;

                .infoBox {
                    overflow: hidden;
                    width: 300px;

                    .leftWords {
                        display: inline-block;
                        float: left;
                        width: 300px;
                    }
                }
            }

            .clickBox {
                position: absolute;
                left: 0;
                z-index: 10;
                width: 100%;
                height: 100%;
            }

            .showButton {
                position: absolute;
                z-index: 99;
                top: 20px;
                right: 30px;
                display: flex;
                justify-content: space-around;
                align-items: center;
            }
        }
    }

    .pagenation {
        position: absolute;
        bottom: 5px;
        left: 0px;
    }

    .showTooltipBox {
        width: 550px;
        height: 860px;
        overflow: hidden;
    }

    .boldText {
        font-weight: 600;
    }
</style>