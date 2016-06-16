/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * treeParallel module
 */
define(['ojs/ojcore', 'knockout'
], function (oj, ko) {
    /**
     * The view model for the main content view template
     */
    function treeParallelContentViewModel() {
        var self = this;
        
        self.date=ko.observable(8);
        
        self.getValue = ko.computed(function(){
            var timer = 1;
            return self.date();
        });
        window.setInterval(function() { self.date(new Date()); }, 1000);
        
        self.loadHomePage = function(){
            history.pushState(null, '', 'index.html');
            oj.Router.sync();
        };
        
    }
    
    return treeParallelContentViewModel;
});
