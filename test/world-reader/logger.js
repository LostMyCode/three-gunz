var mylog = (function () {
    return function () {
        var args = Array.prototype.slice.call(arguments);
        console.log.apply(console, args);
    }
}());

module.exports = mylog;