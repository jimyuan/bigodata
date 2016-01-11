(function($){
  'use strict';
  /*
    render template setting
  */
  var render = Page.compile('basicPanel', 'skuTable', 'reportPanel', 'reportChart'), $sku;


  /*
    actid:     本次活动 id，默认从 url 中获取
    actMsgUrl: 活动信息数据请求地址
    actRptUrl: 活动报告数据请求地址
    rptParams: 活动报告数据请求参数
    actMsgData: 活动基本数据
    actRptData: 活动报告数据
    reRenderChts: 标记活动销售品类分析中的charts是否需要重绘
  */
  var actid = Page.request('actid') || 1,
      actMsgUrl = 'data/event.json',
      actMsgParam = {type: 'GetActMsg', actid: actid || 1},
      actRptUrl = 'data/report.json',
      rptParams = {},
      actMsgData, actRptData,
      reFrashCatCharts;

  /*
    Suggest option 设置：
    1. actStore     选择店铺
    2. actCatalog   选择基本指标
    3. actCompare   添加对比活动
  */
  var actStore, actCatalog, actCompare;

  /* ----------------- split ----------------- */

  /*
    sku 分页处理， 生成供 render 方法使用的 data
      data:    传入原始记录数
      page:    当前页 No.,默认0(第一页)
      pages:   共有页数
      records: 每页记录数，默认10条
  */
  var skuPage = function(data, pg){
    var page = pg - 1 || 0,
        records = arguments[2] || 5,
        count = data.length,
        option = {
          page:  page,
          totle: count,
          pages: Math.ceil(count / records),
          records: records
        },
        _arr = [], f, m;

    for(var i = 0; i < count; i++) {
      f = Math.floor(i / records), m = i % records;
      m === 0 && _arr.push([]);
      _arr[f][m] = data[i];
    }
    return $.extend(option, {data: _arr[page], datas: _arr});
  };

  /*
    magicSuggest method 供 Ajax 获取数据后渲染活动报告选项用
      arguments[0]: suggest 容器的选择符
      arguments[1]: 各 suggest 自定义 options
  */
  var suggest = function(){
    var $ele = $(arguments[0]),
        opts = $.extend({}, Page.settings.suggest, arguments[1]),
        sgst = $ele.magicSuggest(opts);
    return $(sgst);
  };

  /* ----------------- split ----------------- */

  /*
    活动信息ajax (API-1)
    获取活动信息 API 数据进行第一部分页面渲染
  */
  $.get(actMsgUrl, actMsgParam)
    .done(function(data){
      actMsgData = data;

      var basicData = actMsgData.data,
          skuData = actMsgData.act_sku,
          _html   = render['basicPanel'](basicData) + render['reportPanel']();

      $('.container').html(_html);
      $sku = $('.panel:first>.panel-body');
      $sku.html(render['skuTable'](skuPage(actMsgData.act_sku)));
    })
    .done(function(d){
      /*
        活动报告可选项设置
        1. suggest 默认值选择
          - store: 店铺选择
          - compare: 活动对比
          - catalog: 基本指标
        2. 活动店铺
          - 选择全部，则 disable 其他选项，反之亦然
        3. 基本指标
        4. 对比活动
        5. 页面渲染完成后立即生成活动基本指标
      */
      // 1
      var defaultSuggest = {
        // 店铺选择
        store: function(){
          var data = actMsgData.act_store;
          return {
            data: data,
            displayField: 'objtext',
            valueField: 'objid',
            value: data.filter(function(item){
              return item.objid === 'NULL';
            })
          };
        },
        // 活动对比
        compare: function(){
          return {
            data: actMsgData.act_compare,
            displayField: 'act_name',
            valueField: 'act_id'
          };
        },
        // 基本指标
        catalog: function(){
          var data = actMsgData.act_baseindex;
          return {
            data: data,
            displayField: 'objtext',
            valueField: 'objid',
            maxSelection: 6,
            maxSelectionRenderer: function(v){return '最多选取 ' + 6 + ' 项';},
            value: data.filter(function(item){
              return item.default === 1;
            })
          };
        }
      };

      // 2
      actStore = suggest('#storeFront', defaultSuggest.store());
      actStore.on('selectionchange expand', function(){
        var value= this.getValue(),
            data = this.getData();

        if(value.length > 0) {
          value.indexOf('NULL') !== -1
          // 选择全部门店
          ? this.setData(data.map(function(item){
            item.objid !== 'NULL' ? item.disabled = true
            : item.disabled = false;
            return item;
          }))
          // 门店多选
          : this.setData(data.map(function(item){
            item.objid !== 'NULL' ? item.disabled = false
            : item.disabled = true;
            return item;
          }));
        } else {
          this.setData(data.map(function(item){
            delete item.disabled;
            return item;
          }));
        }
      });

      // 3
      actCatalog = suggest('#baseCatalog', defaultSuggest.catalog());
      actCatalog.on('blur', function(){
        this.getSelection().length !== 6 && alert('必须选出6项指标！');
      });

      // 4
      actCompare = suggest('#compareEvent', defaultSuggest.compare());

      // 5
      // $('[data-click=getReport]').trigger('click');
    });

  /* ----------------- split ----------------- */

  /*
    click event area
    1. sku list pagination action
    2. 活动基本指标
    3. 活动基本指标时间趋势图
  */
  var clickEvent = {
    // 1. sku list pagination action
    turnPage: function(e, self){
      e.preventDefault();
      var href = self.attr('href'),
          skuData = actMsgData.act_sku,
          pages = skuPage(skuData).pages, page;

      if(href === '+1' || href === '-1') {
        page = parseInt(self.closest('ul').find('.active > a').attr('href'), 10) + parseInt(href);
      } else {
        page = parseInt(href);
      }
      page = Math.max(1, Math.min(page, pages));
      !isNaN(page)
        && $sku.html(render['skuTable'](skuPage(skuData, page)));

    },

    /*
      2. 活动基本指标
        a. 组装参数
        b. 获取接口数据
        c. 获取接口数据成功，组装 render 数据
        d. trigger基本指标趋势图
        e. 活动销售品类分析图
        f. 活动销售额占比图
    */
    getReport: function(e, obj){
      e.preventDefault();
      var spin = obj.children('i');
      spin.addClass('fa-spin');

      var storeid = actStore[0].getValue(),
          compareid = actCompare[0].getValue(),
          comparetag = actCatalog[0].getValue();
      if (comparetag.length !== 6) {
        actCatalog.trigger('blur');
        return false;
      }
      // a
      $.extend(rptParams, {
        actid: actid,
        storeid: storeid,
        comparetag: comparetag
      });
      comparetag.length > 0
        && $.extend(rptParams, {compareid: compareid});
      // b
      $.get(actRptUrl, rptParams)
        // c. 获取接口数据成功，组装 render 数据
        .done(function(data){
          actRptData = data;
          spin.removeClass('fa-spin');
          $('.form-suggest').siblings().remove();

          var rpData= {};

          // 活动指标表格数据
          rpData.compareTable = {
            catalog: actCatalog[0].getSelection(),
            compare: actRptData.msg_compare,
            activity: [].concat.apply([],[
              actMsgData.data.act_name, actCompare[0].getSelection().map(function(item){
                return item.act_name;
              }),
              '活动总计'])
          };

          // 活动销售额占比数据
          var msgSalesData = actRptData.msg_sales;
          rpData.actCatSale = {
            ttl_ttl: msgSalesData.sales_ttl_ttl,
            tgt_ttl: msgSalesData.sales_target_ttl,
            ttl_target: msgSalesData.sales_ttl_target,
            tgt_target: msgSalesData.sales_target_target
          };
          $('.form-suggest').after($(render['reportChart'](rpData)));
          reFrashCatCharts = {
            '#customer_all': true,
            '#customer_target': true
          };
        })
        // d. trigger基本指标趋势图
        .done(function(){
          $('[data-click=timeAreaChart]').trigger('click');
        })
        // e. 活动销售品类分析图
        .done(function(){
          $('[href=#customer_all]').trigger('click');
        })
        // f. 活动销售额占比图
        .done(function(){
          var pieOpt, ec, sample,
              msgSalesData = actRptData.msg_sales,
              salesPieChart = $('#salesPieChart'),
              allPieChartData = [
                {value: msgSalesData.sales_ttl_ttl - msgSalesData.sales_ttl_target, name: '非活动人群购买总金额'},
                {value: msgSalesData.sales_ttl_target, name: '活动人群购买总金额'}
              ],
              tgtPieChartData = [
                {value: msgSalesData.sales_target_target, name: '非活动人群购买目标产品总金额'},
                {value: msgSalesData.sales_target_ttl - msgSalesData.sales_target_target, name: '活动人群购买目标产品总金额'}
              ],
              pieData = [allPieChartData, tgtPieChartData];

          pieOpt = Page.settings.pieOpts({});
          sample = pieOpt.series[0];
          pieOpt.series = [];

          for(var i = 0, x = pieData.length; i < x; i++) {
            pieOpt.series.push(
              $.extend({}, sample,
                {
                  data: pieData[i],
                  center: [(100 / x / 2 * (2 * i + 1)).toFixed(1) + '%', '50%']
                }
            ));
          }
          ec = echarts.init(salesPieChart[0]);
          ec.setOption(pieOpt);
        });
    },
    /*
      3.活动基本指标时间趋势图
        a. 有指标 checked 时显示趋势图 panel
        b. 有指标选中时，创建该 charts 容器，否则就 remove 掉
    */
    timeAreaChart: function(e, self){
      var $bcPanel = $('#actTimeDriftChart'),
          index = self.data('index'),
          container = $('#baseChart' + index)[0],
          dataset = actRptData.msg_timetrend[index],
          option = Page.settings.ccOpts({
            title: {
              text: self.data('catalog')
            },
            category: dataset.dailydate,
            values:   dataset.dailydata
          }), ec;
      // a
      self.closest('tr').find(':checked').length > 0
        ? $bcPanel.removeClass('hide')
        : $bcPanel.addClass('hide');

      // b
      if(!!!container && self.is(':checked')) {
        $bcPanel.find('.panel-body')
          .append($('<div class="col-xs-6 chart" id="baseChart' + index + '"></div>'));

        var percentage = /%$/.test(dataset.dailydata[0]);
        if(percentage) {
          option.yAxis[0].axisLabel = {
            formatter: '{value}%'
          };
          option.series[0].data = dataset.dailydata.map(function(item){
            return $.isNumeric(item) ? item : parseFloat(item);
          });
        }
        option.xAxis[0].boundaryGap = false;
        ec = echarts.init($('#baseChart' + index)[0], 'macarons');
        ec.setOption(option);
      } else if(!!container && !self.is(':checked')) {
        container.remove();
      } else {
        return;
      }


    },

    /*
      4. 所有/目标客户分析 tab 切换
         (因 dom 隐藏时 echarts 无法 render 图表，因此只有当 dom 显现时才做图表 render 操作)
        a. tab 切换
        b. 销售金额占比 pie chart render
    */
    salesTab: function(e, self){
      e.preventDefault();

      // a
      var id = self.attr('href'), curTab = $(id), symbol = id.slice(1);
      self.parent().addClass('active').siblings().removeClass('active');
      $('.tab-pane').removeClass('active');
      curTab.addClass('active');

      // b
      if(reFrashCatCharts[id]) {
        var cateData = actRptData.msg_category[symbol],
            custData = actRptData.msg_customer[symbol];

        // 第1张饼图
        function subPieRender1(){
          var pieData = [], ec, pieOpt,
              cateName = cateData[0].sales_name,
              cateValue= cateData[0].sales_value,
              category3= cateName.slice(0, 3);

          for(var i = 0, x = cateName.length; i < x; i++) {
            pieData.push({name: cateName[i], value: cateValue[i]});
          }
          pieOpt = Page.settings.pieOpts({
            title: {
              text: '活动期间品类销售金额占比',
              subtext: category3.join(', ') + '是销售金额最大的前 ' + category3.length + ' 品类'
            }
          });
          $.extend(pieOpt.series[0], {
            data: pieData,
            selectedMode: 'single'
          });
          ec = echarts.init($(curTab).find('.chart:eq(0)')[0]);
          ec.setOption(pieOpt);
          ec.on('pieSelected', function(param){
            subPieRender2(param.selected[0].indexOf(true) + 1);
          });
        }

        // 第2张饼图
        function subPieRender2(index){
          var pieData  = [], ec, pieOpt,
              brandData = index > 0 ? cateData[index] : cateData[1],
              brandName = brandData.sales_brandname,
              brandValue= brandData.sales_brandvalue,
              pieTitle  = brandData.sales_name,
              brands3   = brandName.slice(0, 3);

          for(var i = 0, x = brandName.length; i < x; i++) {
            pieData.push({name: brandName[i], value: brandValue[i]});
          }
          pieOpt = Page.settings.pieOpts({
            title: {
              text: pieTitle + '中的品牌销售金额占比',
              subtext: brands3.join(', ') + '是' + pieTitle + '品类中消费金额占比最高的前 '+ brands3.length +' 品牌'
            }
          });
          $.extend(pieOpt.series[0], {data: pieData});
          ec = echarts.init($(curTab).find('.chart:eq(1)')[0]);
          ec.setOption(pieOpt);
        };

        // 第3张柱状图
        function subBarRender3() {
          var cust3 = custData[0].category.slice(0, 3), ec, distData;

          distData = Page.settings.ccOpts({
            title: {
              text: '活动期间品类购买人群分布',
              subtext: cust3.join(', ') + '是活动期间最受人群欢迎的 '+ cust3.length +' 大品类'
            },
            type: 'bar',
            category: custData[0].category,
            values:   custData[0].number
          });
          $.extend(distData.series[0], {
            markPoint: {
              data: [
                {type: 'max', name: '最大值'},
                {type: 'min', name: '最小值'}
              ]
            },
            markLine: {
              data: [
                {type: 'average', name: '平均值'}
              ],
              itemStyle: {
                normal: {
                  lineStyle: {
                    color: 'purple',
                    type: 'dashed'
                  }
                }
              }
            }
          });
          distData.grid = {y: 80};
          ec = echarts.init($(curTab).find('.chart:eq(2)')[0], 'macarons');
          ec.setOption(distData);
          ec.on('click', function(param){
            subPieRender4(param.dataIndex + 1);
            subBarRender5(param.dataIndex + 1);
          });
        }

        // 第4张饼图生成方法
        function subPieRender4(index){
          var pieOpt, ec,
              subCatData = index > 0 ? custData[index] : custData[1],
              category = subCatData.category,
              relation = subCatData.population_distribution.relation,
              notrelated = subCatData.population_distribution.notrelated,
              percentage = (relation / (relation + notrelated) * 100).toFixed(2) + '%';

          pieOpt = Page.settings.pieOpts({
            title: {
              text: category + '品类关联购买人群分布',
              subtext: category + '品类中, '+ percentage +'的客户产生关联消费。'
            }
          });
          $.extend(pieOpt.series[0], {
            data: [
              {name:'关联购买人群', value: relation},
              {name:'未关联购买人群', value: notrelated}
            ]
          });

          ec = echarts.init($(curTab).find('.chart:eq(3)')[0]);
          ec.setOption(pieOpt);
        };

        // 第5张柱状图
        function subBarRender5(index){
          var comboData = index > 0 ? custData[index] : custData[1],
              numbers = comboData.category_analysis_numbers,
              sales = comboData.category_analysis_sales,
              dataOpts = Page.settings.ccOpts({
                title: {
                  text: comboData.category + '品类关联购买品类分析'
                },
                category: custData[0].category
              }), ec;

          dataOpts.yAxis = [
            {type: 'value', name: '人数'},
            {type: 'value', name: '金额'}
          ];
          dataOpts.series = [
            {name: '关联消费人数', type: 'bar', data: numbers},
            {name: '关联消费金额', type: 'line', data: sales, yAxisIndex: 1}
          ];
          dataOpts.legend = {
            data:['关联消费人数','关联消费金额']
          };
          ec = echarts.init($(curTab).find('.chart:eq(4)')[0], 'macarons');
          ec.setOption(dataOpts);
        };

        subPieRender1();
        subPieRender2();
        subBarRender3();
        subPieRender4();
        subBarRender5();
      }
      reFrashCatCharts[id] = false;
    }
  };

  $(document).on('click', '[data-click]', function(e){
    var self = $(this), evt = self.data('click');
    clickEvent[evt] && clickEvent[evt](e, self);
  });

  // 翻页 onchange 事件
  $(document).on('change', '#pageSetting', function(){
    var records = $(this).val() - 0,
        _html = render['skuTable'](skuPage(actMsgData.act_sku, 1, records))
    $sku.html(_html)
  });
})(jQuery);
