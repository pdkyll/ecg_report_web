<template>
    <section v-if="Object.keys(logsData).length > 0">
        <section class="initialList">
            <section></section>
            <SectionList
                    :fontSize="16"
                    :padding="8"
                    :showItem="defaultShowItem"
            />
        </section>
        <ul class="outerBox" v-if="hackResetList">
            <li class="initialList infinite-list-item" v-for="(showData, key, index) in showListData" style="margin-bottom: 20px">
                <section style="position: relative">
                    <el-button style="height: 40px;width: 180px;" type="primary" @click="transformIcon(index)">{{key === curDate? '今日': key}}<i
                            class="el-icon-caret-bottom el-icon--right transformIcon"></i></el-button>
                    <div class="fixLine"></div>
                </section>
                <section class="singleListBox" ref="singleListBox" style="overflow: hidden">
                    <section v-for="showItem in showData">
                        <SectionList
                                class="singleList"
                                :showItem="showItem"
                                :fontSize="14"
                                :padding="10"
                        />
                    </section>
                </section>
            </li>
        </ul>
    </section>
</template>
<script>
    import SectionList from './SectionList';
    import Util from '../../common/util';
    export default {
        name: 'InitialList',
        components: {
            SectionList
        },
        props: {
            logsData: {
                type: Object,
                default: {}
            }
        },
        data() {
            return {
                defaultShowItem: {
                    time: '时间',
                    institutionName: '所属医院',
                    userType: '角色',
                    nickname: '账户名',
                    username: '姓名',
                    category: '操作类别',
                    content: '操作记录'
                },
                curDate: Util.formatTimeD(new Date()),
                showListData: {},
                restKeys: [],
                hackResetList: true
            }
        },
        watch: {
            logsData(logsData) {
                this.showListData = {};
                let keys = Object.keys(logsData);
                this.showListData = logsData;
                //     {
                //     ...this.showListData,
                //     [keys[0]]: logsData[keys[0]]
                // };
                this.restKeys = keys.slice(1);
                this.hackResetList = false;
                this.$nextTick(() => {
                    this.hackResetList = true;
                });
            },
        },
        methods: {
            loadMore() {
                if (this.restKeys.length) {
                    let addKey = this.restKeys.shift();
                    this.showListData = {
                        ...this.showListData,
                        [addKey]: this.logsData[addKey]
                    }
                }
            },
            transformIcon(index) {
                let firstLiHeight = $('.singleList').eq(index).height();
                let outerBoxHeight = $('.singleListBox').eq(index).height();
                if (outerBoxHeight === firstLiHeight + 5) {
                    $('.transformIcon').eq(index).css({
                        transform: 'rotate(0deg)'
                    });
                    $('.singleListBox').eq(index).css({
                        height: 'auto',
                    })
                } else {
                    $('.transformIcon').eq(index).css({
                        transform: 'rotate(-180deg)'
                    });
                    $('.singleListBox').eq(index).css({
                        height: firstLiHeight + 5,
                    })
                }
                let addKey = this.restKeys[0];
                if (Object.keys(this.showListData).indexOf(addKey) === -1) {

                }
            }
        }
    }
</script>
<style scoped lang="scss">
    .initialList {
        position: relative;
        width: 1400px;
        display: grid;
        margin: 0 auto;
        grid-template-columns: 200px 1200px;
    }

    .initialSingleList span {
        display: inline-block;
    }

    .singleListBox {
        border: 1px solid #ccc;
        transition: height 1s linear;
    }

    .fixLine {
        width: 20px;
        height: 1px;
        background-color: #ccc;
        position: absolute;
        right: 0;
        top: 20px;
    }

    .outerBox {
        width: 1410px;
        margin: 0 auto;
    }

   .transformIcon {
       transition: transform .2s linear;
   }
</style>