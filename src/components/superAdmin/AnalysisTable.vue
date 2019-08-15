<template>
    <div class="analysis-table" v-loading="loading">
        <el-table
                highlight-current-row
                @sort-change="tableSort"
                :data="resultData"
                border
                :cell-class-name="addCellClass"
                style="width: 100%;">
            <el-table-column
                    type="index"
                    width="60px"
                    :index="normalizeIndex"
                    label="排名">
            </el-table-column>
            <el-table-column
                    v-for="(item, index) in tableData.settingData"
                    :prop="item.key"
                    :show-overflow-tooltip="true"
                    :sortable="item.sortKey"
                    :label="item.label">
                <template slot-scope="scope">
                    <p v-if="item.formatter">{{item.formatter(scope)}}</p>
                    <p v-else>{{scope.row[item.key]}}</p>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
                @current-change="handleCurrentChange"
                :current-page.sync="pageIndex"
                :page-size="pageSize"
                layout="prev, pager, next, jumper"
                :total="totalCount">
        </el-pagination>
    </div>
</template>
<script type="text/ecmascript-6">
    export default {
        props: {
            tableData: {
                type: Object,
                default: function () {
                    return {}
                }
            },
            queryData: {
                type: Object,
                default: function () {
                    return {}
                }
            },
            pageSize: {
                type: Number,
                default: 5
            }
        },
        watch: {
            queryData() {
                this.pageIndex = 0
                this.filterData.pageIndex = 0
                this._loadData(this.filterData)
            }
        },
        created() {
            this._loadData(this.filterData)
        },
        data() {
            return {
                loading: false,
                totalCount: 0, // 总共条数
                resultData: [],
                pageIndex: 1,
                filterData: {
                    pageIndex: 0,
                    sortField: '',
                    sortType: ''
                },
                sortOrderMap: {
                    ascending: 'UP',
                    descending: 'DOWN'
                }
            }
        },
        methods: {
            addCellClass({row, column, rowIndex, columnIndex}) {
                if (this.filterData.pageIndex === 0) {
                    if (rowIndex < 3 && (columnIndex === 0 || columnIndex === 3 || columnIndex === 4)) {
                        return 'active-red'
                    } else if (rowIndex < 3 && (columnIndex === 1 || columnIndex === 2)) {
                        return 'active-blue'
                    }
                }
            },
            normalizeIndex(index) {
                return this.filterData.pageIndex * this.pageSize + index + 1
            },
            _loadData(param) {
                let params = Object.assign({}, param, this.queryData, {pageSize: this.pageSize})
                this.loading = true
                this.tableData.loadFunction(params).then((data) => {
                    this.resultData = data.entities
                    this.filterData.pageIndex = data.pageIndex
                    this.pageIndex = data.pageIndex + 1
                    this.totalCount = data.totalRowCount
                    this.loading = false
                })
            },
            tableSort({column, prop, order}) {
                if (column) {
                    this.filterData.sortField = column.sortable;
                    this.filterData.pageIndex = 0
                    this.pageIndex = 1
                    this.filterData.sortType = this.sortOrderMap[order];
                    this._loadData(this.filterData)
                } else {
                    this.filterData.sortField = '';
                    this.filterData.sortType = '';
                    this.filterData.pageIndex = 0
                    this.pageIndex = 1
                    this._loadData(this.filterData)
                }
            },
            handleCurrentChange() {
                this.filterData.pageIndex = this.pageIndex - 1
                this._loadData(this.filterData)
            }
        }
    }
</script>
<style type="text/css" scoped lang="scss">
    .analysis-table {
        width: 100%;
    }
    .t-c {
        text-align: center;
    }
    .analysis-table /deep/ {
        .active-red{
            color: #ff0000;
        }
        .active-blue {
            color: #409EFF;
        }
    }
</style>