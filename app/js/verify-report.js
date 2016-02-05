(function($){
  'use strict';
  /*
    render template setting
  */
  var render = Page.compile('basicPanel', 'bigoTable');

  /*
    actMsgData: 请求到的数据，缓存在此
    actCompareData: 2次请求的对比数据，缓存在此
    frashCatCharts: 切换 tab 时刷新 render 图标志
  */
  var actMsgData, actCompareData, frashCatCharts = {},
      custSort = {
        '所有客户': 'total',
        '活跃客户': 'customer_active',
        '沉默客户': 'customer_silence',
        '品牌新客': 'customer_new'
      };

  /*
    活动验证报表 ajax (API-1)
    获取活动验证报表 API 数据进行第一部分页面渲染
  */
  var actid = Page.request('actid') || 8,
      actMsgUrl = Page.api.verifyInfo,
      actMsgParam = {type: 'GetActMsg', actid: actid},
      actRptUrl = Page.api.verifyReport,
      actRptParam = $.extend({}, actMsgParam, {type: 'GetActReport'});
  $.get(actMsgUrl, actMsgParam)
    /*
      页面内容生成
    */
    .done(function(data){
      actMsgData = $.isPlainObject(data) ? data : $.parseJSON(data);
      actCompareData = actMsgData.msg_compare;

      var basicData = actMsgData.data,
          _html   = render['basicPanel']($.extend(
            {},
            basicData,
            {status: Page.settings.status[basicData.act_status]},
            {custSort, custSort}
          )),
          _table  = render['bigoTable']($.extend(
            {},
            actCompareData,
            {custSort: custSort}
          ));

      $('.container').html(_html);
      $('#bigoSumTable').html(_table);
    })
    /*
      设置 chart 可渲染标志
    */
    .done(function(){
      for(var key in custSort) {
        frashCatCharts['#' + custSort[key]] = true;
      }
      // 默认切换到首个 tab
      $('[data-click="swithCust"]:first').trigger('click');
      // 默认收起 table 的明细行
      $('[data-click="switchDataRows"]').trigger('click');
    });

  /*
    所有 click 事件定义
  */
  var clickEvent = {
    /*
      tab 切换
      1. ui 变换
      2. charts render
    */
    swithCust: function(e, self){
      e.preventDefault();
      // 1
      var id = self.attr('href'),
          curTab = $(id), ec,
          symbol = id.slice(1);

      self.parent().addClass('active').siblings().removeClass('active');
      $('.tab-pane').removeClass('active');
      curTab.addClass('active');

      // 2
      if(frashCatCharts[id]){
        var series = function(){
          var index = actCompareData.index,
              tgArr = actCompareData.tg_customer[symbol],
              csArr = actCompareData.cs_customer[symbol],
              cpArr = actCompareData.compare[symbol],
              arr = [], tgData, csData, ranger, piePos;

          var dataStyle = {
            normal: {
              label: {
                show: true,
                position: 'center',
                formatter: '{b}',
                textStyle: {
                  baseline: 'bottom'
                }
              },
              labelLine: {show: false}
            }
          };
          var placeHolderStyle = {
            normal : {
              color: 'rgba(0,0,0,0)',
              label: {show: false},
              labelLine: {show: false}
            },
            emphasis : {
              color: 'rgba(0,0,0,0)'
            }
          };
          for(var i = 0, x = index.length; i < x; i++) {
            tgData = Page.filterData(tgArr[i]);
            csData = Page.filterData(csArr[i]);
            ranger = Page.upRange(Math.max(tgData, csData));

            i < 4
              ? piePos = [(100 / x / 2 * (4 * i + 2)).toFixed(1) + '%', '25%']
              : piePos = [(100 / x / 2 * (4 * (i - 4) + 2)).toFixed(1) + '%', '75%'];

            arr.push({
              type: 'pie',
              center: piePos,
              radius: ['34%', '40%'],
              data : [
                {name: 'invisible', value: ranger - tgData, itemStyle: placeHolderStyle},
                {name: index[i] + '\n', value: tgData, itemStyle: dataStyle}
              ]
            }, {
              type: 'pie',
              center: piePos,
              radius: ['28%', '34%'],

              data : [
                {name: 'invisible', value: ranger - tgData, itemStyle: placeHolderStyle},
                {name: cpArr[i], value: csData, itemStyle: dataStyle}
              ]
            });
          }
          return arr;
        };
        ec = echarts.init(curTab[0], 'macarons');
        ec.setOption({
          legend: {
            x: 'center',
            y: 'center',
            data: []
          },
          title: {show: false},
          tooltip: {show: false},
          toolbox: {show: false},
          series: series()
        });
        $(window).on('resize', ec.resize);
      }
      frashCatCharts[id] = false;
    },
    /*
      折叠、展开 table 部分行
    */
    switchDataRows: function(e, self) {
      var rowDnClass = 'fa-caret-square-o-down',
          rowUpClass = 'fa-caret-square-o-right',
          $icon = self.children('i'),
          isExpand = $icon.hasClass(rowDnClass);
      if(isExpand) {
        $icon.removeClass(rowDnClass).addClass(rowUpClass);
        self.prev().removeAttr('rowspan');
        self.parent().next().hide().next().hide().next().hide();
      } else {
        $icon.removeClass(rowUpClass).addClass(rowDnClass);
        self.prev().attr('rowspan', 4);
        self.parent().next().show().next().show().next().show();
      }
      // console.log(isExpand);
    }
  };

  /* 封装 click 事件，委托在 document 上 */
  $(document).on('click', '[data-click]', function(e){
    var self = $(this), evt = self.data('click');
    clickEvent[evt] && clickEvent[evt](e, self);
  });

  // 店铺列表 onchange 事件
  $(document).on('change', '#storeList', function(){
    var storeid = $(this).val();
    // 无论如何，重置 chart 的可 render 标志
    for(var key in custSort) {
      frashCatCharts['#' + custSort[key]] = true;
    }

    if(storeid !== '0') {
      /*
        获取新数据，重新 render 表格
      */
      $.get(actRptUrl, $.extend(actRptParam, {storeid: storeid}))
        .done(function(data){
          var d = $.isPlainObject(data) ? data : $.parseJSON(data);
          actCompareData = d.msg_compare;
          $('#bigoSumTable').html(render['bigoTable']($.extend(
            {},
            actCompareData,
            {custSort: custSort}
          )));
          // 默认切换到首个 tab
          $('[data-click="swithCust"]:first').trigger('click');
          // 默认收起 table 的明细行
          $('[data-click="switchDataRows"]').trigger('click');
        });
    } else {
      /*
        所有客户表格数据第一次 ajax 请求已缓存，不必重新请求
      */
      actCompareData = actMsgData.msg_compare;
      $('#bigoSumTable').html(render['bigoTable']($.extend(
        {},
        actCompareData,
        {custSort: custSort}
      )));
      // 默认切换到首个 tab
      $('[data-click="swithCust"]:first').trigger('click');
      // 默认收起 table 的明细行
      $('[data-click="switchDataRows"]').trigger('click');
    }
  });
})(jQuery);
