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
  */
  var actid = Page.request('actid') || 1,
      actMsgUrl = 'data/event.json',
      actMsgParam = {type: 'GetActMsg', actid: actid || 1},
      actRptUrl = 'data/report.json',
      rptParams = {},
      actMsgData, actRptData;

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

  /*
    活动基本指标趋势图基本设置
  */
  var chartSet = {
    pieChart: function(container, pcData, selected){
      var option = {
        title: pcData.title || {show: false},
        tooltip : {
          show: pcData.data.length < 3 ? false: true,
          trigger: 'item',
          formatter: "{b}: {c} ({d}%)"
        },
        toolbox: {
          show: true,
          feature: {
            restore: {show: true},
            saveAsImage: {show: true}
          }
        },
        calculable : false,
        series : []
      }, data = pcData.data, ec;
      var series = {
        selectedMode: selected ? 'single' : null,
        type:'pie',
        radius: '55%',
        center: ['50%', '50%'],
      }

      if(pcData.multi) {
        for(var i=0, x=data.length; i<x; i++) {
          option.series.push(
            $.extend({}, series,
            {
              data: data[i],
              center: [(100 / x / 2 * (2 * i + 1)).toFixed(1) + '%', '50%']
            }
          ));
        }
      } else {
        option.series.push($.extend({}, series, {data: data}));
      }

      ec = echarts.init(container, 'macarons');
      ec.setOption(option);
      return ec;
    }
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
          window[$('li.active > a').attr('href')] = false;
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
          var msgSalesData = actRptData.msg_sales,
              salesPieChart = $('#salesPieChart'),
              // tgtPieChart = $('#tgtPieChart'),
              allPieChartData = [
                {value: msgSalesData.sales_ttl_ttl - msgSalesData.sales_ttl_target, name: '非活动人群购买总金额'},
                {value: msgSalesData.sales_ttl_target, name: '活动人群购买总金额'}
              ],
              tgtPieChartData = [
                {value: msgSalesData.sales_target_target, name: '非活动人群购买目标产品总金额'},
                {value: msgSalesData.sales_target_ttl - msgSalesData.sales_target_target, name: '活动人群购买目标产品总金额'}
              ];


          chartSet.pieChart(salesPieChart[0], {
            data: [allPieChartData, tgtPieChartData],
            multi: true
          });
          // chartSet.pieChart(tgtPieChart[0], {data: tgtPieChartData, title:{text: '目标产品购买人群'}});

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
      var id = self.attr('href'), curTab = $(id);
      self.parent().addClass('active').siblings().removeClass('active');
      $('.tab-pane').removeClass('active');
      curTab.addClass('active');

      if(!window[id]) {
        // b
        var i, x, catsData, cats,
        pieChart = [], curObj = id.slice(1),
        custData = actRptData.msg_category[curObj],
        custName = custData[0].sales_name,
        custValue= custData[0].sales_value,
        pieTitle = '活动期间品类销售金额占比';
        for(i = 0, x = custName.length; i < x; i++) {
          pieChart.push({name: custName[i], value: custValue[i]});
        }
        cats = custName.slice(0, 3);
        catsData = {
          data: pieChart,
          title: {
            text: pieTitle,
            subtext: cats.join(', ') + '是销售金额最大的前 ' + cats.length + ' 品类'
          }
        };

        // 第2张饼图
        var subPieRender2 = function(index){
          var pieChart = [], catData, brands,
          custData = actRptData.msg_category[curObj], i, x,
          subBrandData = index > 0 ? custData[index] : custData[1],
          subBrandName = subBrandData.sales_brandname,
          subBrandValue= subBrandData.sales_brandvalue,
          pieTitle = subBrandData.sales_name;

          for(i = 0, x = subBrandName.length; i < x; i++) {
            pieChart.push({name: subBrandName[i], value: subBrandValue[i]});
          }
          brands = subBrandName.slice(0, 3);
          catData = {
            data: pieChart,
            title: {
              text: pieTitle + '中的品牌销售金额占比',
              subtext: brands.join(', ') + '是' + pieTitle + '品类中消费金额占比最高的前 '+ brands.length +' 品牌'
            }
          };
          chartSet.pieChart($(curTab).find('.chart:eq(1)')[0], catData);
        };

        // 第5张柱状图
        var subChartRender5 = function(index, relation){
            index = index || 1;
            relation = !!!relation ? 'relation' : 'notrelated';

          var comboData = actRptData.msg_customer[curObj][index],
              numbers = comboData.category_analysis_numbers[relation],
              sales = comboData.category_analysis_sales[relation],
              dataOpts = Page.settings.ccOpts({
                title: {
                  text: comboData.category + '品类关联购买品类分析'
                },
                category: actRptData.msg_customer[curObj][0].category
              }), ec5;

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
          ec5 = echarts.init($(curTab).find('.chart:eq(4)')[0], 'macarons');
          ec5.setOption(dataOpts);
        };

        // 第4张饼图生成方法
        var subPieRender4 = function(index){
          var custData = actRptData.msg_customer[curObj],
          subCatData = index > 0 ? custData[index] : custData[1],
          category = subCatData.category,
          relation = subCatData.population_distribution.relation,
          notrelated = subCatData.population_distribution.notrelated,
          percentage = (relation / (relation + notrelated) * 100).toFixed(2) + '%',
          pieData = {
            title: {
              text: category + '品类关联购买人群分布',
              subtext: category + '品类中, '+ percentage +'的客户产生关联消费。'
            },
            data: [
              {name:'关联购买人群', value: relation},
              {name:'未关联购买人群', value: notrelated}
            ]
          };
          var ec = chartSet.pieChart($(curTab).find('.chart:eq(3)')[0], pieData, true);
          ec.on(echarts.config.EVENT.PIE_SELECTED, function(param){
            subChartRender5(index, param.selected[0].indexOf(true));
          });
          subChartRender5(index);
        };


        // 第1张饼图
        chartSet.pieChart($(curTab).find('.chart:eq(0)')[0], catsData, true)
        .on(echarts.config.EVENT.PIE_SELECTED, function(param){
          subPieRender2(param.selected[0].indexOf(true) + 1);
        });

        subPieRender2();
        subPieRender4();

        // 第3张柱状图
        var customer = actRptData.msg_customer[curObj], ec3;
        cats = customer[0].category.slice(0, 3);

        var distData = Page.settings.ccOpts({
          title: {
            text: '活动期间品类购买人群分布',
            subtext: cats.join(', ') + '是活动期间最受人群欢迎的 '+ cats.length +' 大品类'
          },
          type: 'bar',
          category: customer[0].category,
          values:   customer[0].number
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
        ec3 = echarts.init($(curTab).find('.chart:eq(2)')[0], 'macarons');
        ec3.setOption(distData);
        ec3.on('click', function(param){
          subPieRender4(param.dataIndex + 1);
        });
      }
      window[id] = true;
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
