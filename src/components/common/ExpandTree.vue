<template>
  <span class="expandBox">
            <el-input
                    :style="{width:width+'px'}"
                    readonly
                    :placeholder="placeholder"
                    :disabled="disablState"
                    v-model="hospitalName"
                    @focus="focusInput"
                    @blur="blurInput"
            >
                <i slot="suffix" class="el-input__icon el-icon-error"
                   v-if="hospitalName!=='' && hasClearBtn" style="cursor: pointer;" @click="clear"></i>
            </el-input>
            <div class="el-treeBox"
                 v-if="showExpand"
                 @mouseenter="enterTreeBoxState = true;"
                 @mouseleave="enterTreeBoxState = false;"
                 v-loading="loading"
            >
                <el-tree
                        empty-text=""
                        :data="treeData"
                        node-key="id"
                        default-expand-all
                        @node-click="handleNodeClick">
                        <span class="custom-tree-node" slot-scope="{ node, data }">
                            <span :style="{color:nodeTextColor(data)}">{{ data.label}}{{nodeReportCountText(data)}}</span>
                        </span>
                </el-tree>
            </div>
  </span>
</template>

<script>
    import {bus} from '../../bus';

    export default {
        name: 'ExpandTree',
        props: {
            data: {
                type: Object,
                default: function () {
                    return {}
                }
            },
            placeholder: {
                type: String,
                default: ''
            },
            width: {
                type: Number,
                default: 200
            },
            treeData: {
                type: Array,
                default: function () {
                    return []
                }
            },
            loading: {
                type: Boolean,
                default: false
            },
            defaultValue: {
                type: String,
                default: ''
            },
            disablState: {
                type: Boolean,
                default: false
            },
            forseValue: {
                type: String,
                default: ''
            },
            isShowReportCount: {
                type: Boolean,
                default: true
            },
            treeKey: {
                type: String,
                default: ''
            },
            hasClearBtn:{
                type: Boolean,
                default: true
            }
        },
        data() {
            return {
                hospitalName: this.defaultValue,
                showExpand: false,
                enterTreeBoxState: false,
            }
        },
        mounted() {
            console.log(this.defaultValue);
            bus.$on('resetExpandTree', this.reset);
            if (this.forseValue !== '') {
                this.hospitalName = this.forseValue;
            }
        },
        methods: {
            handleNodeClick(val) {
                if (val.userCare && val.reportCount !== 0) {
                    this.hospitalName = val.label;
                    if (this.treeKey !== '') {
                        this.$emit('selectValue', val, this.treeKey, this.data);
                    } else {
                        this.$emit('selectValue', val);
                    }
                }
                this.showExpand = false;
            },
            blurInput() {
                if (!this.enterTreeBoxState) {
                    this.showExpand = false;
                }
            },
            focusInput() {
                this.showExpand = true;
                this.$emit('focus');
            },
            reset() {
                this.hospitalName = '';
            },
            nodeTextColor(data) {

                if(data.label === this.defaultValue) {
                    return '#f70f14'
                }
                if (data.userCare && data.reportCount !== 0) {
                    return '#606266'
                } else {
                    return '#bbbfc7'
                }
            },
            nodeReportCountText(data) {
                if (data.reportCount !== undefined) {
                    return `(${data.reportCount})`
                }
            },
            clear() {
                this.reset();
                this.showExpand = false;
                if (this.treeKey !== '') {
                    this.$emit('clear', this.treeKey, this.data);
                } else {
                    this.$emit('clear');
                }
            }
        }
    }
</script>
<style>

</style>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    .expandBox {
        position: relative;
    }

    .el-treeBox {
        border: 1px solid #ccc;
        border-radius: 3px;
        position: absolute;
        z-index: 2099;
        top: 34px;
        left: 0;
        min-width: 198px;
        max-height: 500px;
        overflow: auto;
    }
</style>
