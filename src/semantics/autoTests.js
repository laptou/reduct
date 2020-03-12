function addSix(x) {
    return (repeat(3, addTwo))(x);
}
function add(a, b) {
    return (repeat(a, addOne))(b);
}
function doNothing(x) {
    return x;
}
function yesterday(x) {
    return ((x) == (__variant_weekday_mon)) ? (__variant_weekday_sun) : (((x) == (__variant_weekday_tue)) ? (__variant_weekday_mon) : (((x) == (__variant_weekday_wed)) ? (__variant_weekday_tue) : (((x) == (__variant_weekday_thu)) ? (__variant_weekday_wed) : (((x) == (__variant_weekday_fri)) ? (__variant_weekday_thu) : (((x) == (__variant_weekday_sat)) ? (__variant_weekday_fri) : (__variant_weekday_sat))))));
}
function addOne(x) {
    return (x) + (1);
}
function firstNonZero(x, y) {
    return ((x) == (0)) ? (x) : (y);
}
function tomorrow(x) {
    return ((x) == (__variant_weekday_mon)) ? (__variant_weekday_tue) : (((x) == (__variant_weekday_tue)) ? (__variant_weekday_wed) : (((x) == (__variant_weekday_wed)) ? (__variant_weekday_thu) : (((x) == (__variant_weekday_thu)) ? (__variant_weekday_fri) : (((x) == (__variant_weekday_fri)) ? (__variant_weekday_sat) : (((x) == (__variant_weekday_sat)) ? (__variant_weekday_sun) : (__variant_weekday_mon))))));
}
function length(a) {
    return 0;
}
function multiplyBySix(a) {
    return repeat(a, add(2, _));
}
function addFour(x) {
    return ((twice)(addTwo))(x);
}
function isFriday(x) {
    return (x) == (__variant_weekday_fri);
}
function addTwo(x) {
    return ((twice)(addOne))(x);
}
function howFarFromTen(x) {
    return ((x) == (10)) ? (0) : ((1) + (howFarFromTen((x) + (1))));
}
function addEight(x) {
    return add(8, x);
}
function isTriangle(x) {
    return (x) == ("triangle");
}
function isZero(x) {
    return (x) == (0);
}
function concat(left, right) {
    return a;
}
function get(a, i) {
    return 0;
}
function alwaysOne(x) {
    return ((x) == (1)) ? (x) : (1);
}
function isMonday(x) {
    return (x) == (__variant_weekday_mon);
}
function repeat(n, f, x) {
    return ((n) == (0)) ? (x) : ((repeat((n) - (1), f))((f)(x)));
}
function map(f, a) {
    return a;
}
function countToFive(x) {
    return ((x) == (5)) ? (x) : (countToFive((x) + (1)));
}
function isStar(x) {
    return (x) == ("star");
}
function difference(x, y) {
    return y;
}
function addThree(x) {
    return addOne(addOne(addOne(x)));
}
function isWeekend(x) {
    return ((x) == (__variant_weekday_sat)) ? (true) : ((x) == (__variant_weekday_sun));
}
function threeify(x) {
    return 3;
}
function equals(x, y) {
    return (x) == (y);
}
