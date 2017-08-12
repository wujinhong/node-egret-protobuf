/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>
 Copyright 2009 The Closure Library Authors. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS-IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license Long.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/Long.js for details
 */
(function(global) {
    "use strict";

    /**
     * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as *signed* integers.
     *  See the from* functions below for more convenient ways of constructing Longs.
     * @exports Long
     * @class A Long class for representing a 64 bit two's-complement integer value.
     * @param {number} low The low (signed) 32 bits of the long
     * @param {number} high The high (signed) 32 bits of the long
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @constructor
     */
    var Long = function(low, high, unsigned) {

        /**
         * The low 32 bits as a signed value.
         * @type {number}
         * @expose
         */
        this.low = low|0;

        /**
         * The high 32 bits as a signed value.
         * @type {number}
         * @expose
         */
        this.high = high|0;

        /**
         * Whether unsigned or not.
         * @type {boolean}
         * @expose
         */
        this.unsigned = !!unsigned;
    };

    // The internal representation of a long is the two given signed, 32-bit values.
    // We use 32-bit pieces because these are the size of integers on which
    // Javascript performs bit-operations.  For operations like addition and
    // multiplication, we split each number into 16 bit pieces, which can easily be
    // multiplied within Javascript's floating-point representation without overflow
    // or change in sign.
    //
    // In the algorithms below, we frequently reduce the negative case to the
    // positive case by negating the input(s) and then post-processing the result.
    // Note that we must ALWAYS check specially whether those values are MIN_VALUE
    // (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
    // a positive number, it overflows back into a negative).  Not handling this
    // case would often result in infinite recursion.
    //
    // Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from*
    // methods on which they depend.

    /**
     * Tests if the specified object is a Long.
     * @param {*} obj Object
     * @returns {boolean}
     * @expose
     */
    Long.isLong = function(obj) {
        return (obj && obj instanceof Long) === true;
    };

    /**
     * A cache of the Long representations of small integer values.
     * @type {!Object}
     * @inner
     */
    var INT_CACHE = {};

    /**
     * A cache of the Long representations of small unsigned integer values.
     * @type {!Object}
     * @inner
     */
    var UINT_CACHE = {};

    /**
     * Returns a Long representing the given 32 bit integer value.
     * @param {number} value The 32 bit integer in question
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @returns {!Long} The corresponding Long value
     * @expose
     */
    Long.fromInt = function(value, unsigned) {
        var obj, cachedObj;
        if (!unsigned) {
            value = value | 0;
            if (-128 <= value && value < 128) {
                cachedObj = INT_CACHE[value];
                if (cachedObj)
                    return cachedObj;
            }
            obj = new Long(value, value < 0 ? -1 : 0, false);
            if (-128 <= value && value < 128)
                INT_CACHE[value] = obj;
            return obj;
        } else {
            value = value >>> 0;
            if (0 <= value && value < 256) {
                cachedObj = UINT_CACHE[value];
                if (cachedObj)
                    return cachedObj;
            }
            obj = new Long(value, (value | 0) < 0 ? -1 : 0, true);
            if (0 <= value && value < 256)
                UINT_CACHE[value] = obj;
            return obj;
        }
    };

    /**
     * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
     * @param {number} value The number in question
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @returns {!Long} The corresponding Long value
     * @expose
     */
    Long.fromNumber = function(value, unsigned) {
        unsigned = !!unsigned;
        if (isNaN(value) || !isFinite(value))
            return Long.ZERO;
        if (!unsigned && value <= -TWO_PWR_63_DBL)
            return Long.MIN_VALUE;
        if (!unsigned && value + 1 >= TWO_PWR_63_DBL)
            return Long.MAX_VALUE;
        if (unsigned && value >= TWO_PWR_64_DBL)
            return Long.MAX_UNSIGNED_VALUE;
        if (value < 0)
            return Long.fromNumber(-value, unsigned).negate();
        return new Long((value % TWO_PWR_32_DBL) | 0, (value / TWO_PWR_32_DBL) | 0, unsigned);
    };

    /**
     * Returns a Long representing the 64 bit integer that comes by concatenating the given low and high bits. Each is
     *  assumed to use 32 bits.
     * @param {number} lowBits The low 32 bits
     * @param {number} highBits The high 32 bits
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @returns {!Long} The corresponding Long value
     * @expose
     */
    Long.fromBits = function(lowBits, highBits, unsigned) {
        return new Long(lowBits, highBits, unsigned);
    };

    /**
     * Returns a Long representation of the given string, written using the specified radix.
     * @param {string} str The textual representation of the Long
     * @param {(boolean|number)=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @param {number=} radix The radix in which the text is written (2-36), defaults to 10
     * @returns {!Long} The corresponding Long value
     * @expose
     */
    Long.fromString = function(str, unsigned, radix) {
        if (str.length === 0)
            throw Error('number format error: empty string');
        if (str === "NaN" || str === "Infinity" || str === "+Infinity" || str === "-Infinity")
            return Long.ZERO;
        if (typeof unsigned === 'number') // For goog.math.long compatibility
            radix = unsigned,
            unsigned = false;
        radix = radix || 10;
        if (radix < 2 || 36 < radix)
            throw Error('radix out of range: ' + radix);

        var p;
        if ((p = str.indexOf('-')) > 0)
            throw Error('number format error: interior "-" character: ' + str);
        else if (p === 0)
            return Long.fromString(str.substring(1), unsigned, radix).negate();

        // Do several (8) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = Long.fromNumber(Math.pow(radix, 8));

        var result = Long.ZERO;
        for (var i = 0; i < str.length; i += 8) {
            var size = Math.min(8, str.length - i);
            var value = parseInt(str.substring(i, i + size), radix);
            if (size < 8) {
                var power = Long.fromNumber(Math.pow(radix, size));
                result = result.multiply(power).add(Long.fromNumber(value));
            } else {
                result = result.multiply(radixToPower);
                result = result.add(Long.fromNumber(value));
            }
        }
        result.unsigned = unsigned;
        return result;
    };

    /**
     * Converts the specified value to a Long.
     * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val Value
     * @returns {!Long}
     * @expose
     */
    Long.fromValue = function(val) {
        if (typeof val === 'number')
            return Long.fromNumber(val);
        if (typeof val === 'string')
            return Long.fromString(val);
        if (Long.isLong(val))
            return val;
        // Throws for not an object (undefined, null):
        return new Long(val.low, val.high, val.unsigned);
    };

    // NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
    // no runtime penalty for these.

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_16_DBL = 1 << 16;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_24_DBL = 1 << 24;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;

    /**
     * @type {!Long}
     * @const
     * @inner
     */
    var TWO_PWR_24 = Long.fromInt(TWO_PWR_24_DBL);

    /**
     * Signed zero.
     * @type {!Long}
     * @expose
     */
    Long.ZERO = Long.fromInt(0);

    /**
     * Unsigned zero.
     * @type {!Long}
     * @expose
     */
    Long.UZERO = Long.fromInt(0, true);

    /**
     * Signed one.
     * @type {!Long}
     * @expose
     */
    Long.ONE = Long.fromInt(1);

    /**
     * Unsigned one.
     * @type {!Long}
     * @expose
     */
    Long.UONE = Long.fromInt(1, true);

    /**
     * Signed negative one.
     * @type {!Long}
     * @expose
     */
    Long.NEG_ONE = Long.fromInt(-1);

    /**
     * Maximum signed value.
     * @type {!Long}
     * @expose
     */
    Long.MAX_VALUE = Long.fromBits(0xFFFFFFFF|0, 0x7FFFFFFF|0, false);

    /**
     * Maximum unsigned value.
     * @type {!Long}
     * @expose
     */
    Long.MAX_UNSIGNED_VALUE = Long.fromBits(0xFFFFFFFF|0, 0xFFFFFFFF|0, true);

    /**
     * Minimum signed value.
     * @type {!Long}
     * @expose
     */
    Long.MIN_VALUE = Long.fromBits(0, 0x80000000|0, false);

    /**
     * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer.
     * @returns {number}
     * @expose
     */
    Long.prototype.toInt = function() {
        return this.unsigned ? this.low >>> 0 : this.low;
    };

    /**
     * Converts the Long to a the nearest floating-point representation of this value (double, 53 bit mantissa).
     * @returns {number}
     * @expose
     */
    Long.prototype.toNumber = function() {
        if (this.unsigned) {
            return ((this.high >>> 0) * TWO_PWR_32_DBL) + (this.low >>> 0);
        }
        return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
    };

    /**
     * Converts the Long to a string written in the specified radix.
     * @param {number=} radix Radix (2-36), defaults to 10
     * @returns {string}
     * @override
     * @throws {RangeError} If `radix` is out of range
     * @expose
     */
    Long.prototype.toString = function(radix) {
        radix = radix || 10;
        if (radix < 2 || 36 < radix)
            throw RangeError('radix out of range: ' + radix);
        if (this.isZero())
            return '0';
        var rem;
        if (this.isNegative()) { // Unsigned Longs are never negative
            if (this.equals(Long.MIN_VALUE)) {
                // We need to change the Long value before it can be negated, so we remove
                // the bottom-most digit in this base and then recurse to do the rest.
                var radixLong = Long.fromNumber(radix);
                var div = this.div(radixLong);
                rem = div.multiply(radixLong).subtract(this);
                return div.toString(radix) + rem.toInt().toString(radix);
            } else
                return '-' + this.negate().toString(radix);
        }

        // Do several (6) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = Long.fromNumber(Math.pow(radix, 6), this.unsigned);
        rem = this;
        var result = '';
        while (true) {
            var remDiv = rem.div(radixToPower),
                intval = rem.subtract(remDiv.multiply(radixToPower)).toInt() >>> 0,
                digits = intval.toString(radix);
            rem = remDiv;
            if (rem.isZero())
                return digits + result;
            else {
                while (digits.length < 6)
                    digits = '0' + digits;
                result = '' + digits + result;
            }
        }
    };

    /**
     * Gets the high 32 bits as a signed integer.
     * @returns {number} Signed high bits
     * @expose
     */
    Long.prototype.getHighBits = function() {
        return this.high;
    };

    /**
     * Gets the high 32 bits as an unsigned integer.
     * @returns {number} Unsigned high bits
     * @expose
     */
    Long.prototype.getHighBitsUnsigned = function() {
        return this.high >>> 0;
    };

    /**
     * Gets the low 32 bits as a signed integer.
     * @returns {number} Signed low bits
     * @expose
     */
    Long.prototype.getLowBits = function() {
        return this.low;
    };

    /**
     * Gets the low 32 bits as an unsigned integer.
     * @returns {number} Unsigned low bits
     * @expose
     */
    Long.prototype.getLowBitsUnsigned = function() {
        return this.low >>> 0;
    };

    /**
     * Gets the number of bits needed to represent the absolute value of this Long.
     * @returns {number}
     * @expose
     */
    Long.prototype.getNumBitsAbs = function() {
        if (this.isNegative()) // Unsigned Longs are never negative
            return this.equals(Long.MIN_VALUE) ? 64 : this.negate().getNumBitsAbs();
        var val = this.high != 0 ? this.high : this.low;
        for (var bit = 31; bit > 0; bit--)
            if ((val & (1 << bit)) != 0)
                break;
        return this.high != 0 ? bit + 33 : bit + 1;
    };

    /**
     * Tests if this Long's value equals zero.
     * @returns {boolean}
     * @expose
     */
    Long.prototype.isZero = function() {
        return this.high === 0 && this.low === 0;
    };

    /**
     * Tests if this Long's value is negative.
     * @returns {boolean}
     * @expose
     */
    Long.prototype.isNegative = function() {
        return !this.unsigned && this.high < 0;
    };

    /**
     * Tests if this Long's value is positive.
     * @returns {boolean}
     * @expose
     */
    Long.prototype.isPositive = function() {
        return this.unsigned || this.high >= 0;
    };

    /**
     * Tests if this Long's value is odd.
     * @returns {boolean}
     * @expose
     */
    Long.prototype.isOdd = function() {
        return (this.low & 1) === 1;
    };

    /**
     * Tests if this Long's value is even.
     * @returns {boolean}
     * @expose
     */
    Long.prototype.isEven = function() {
        return (this.low & 1) === 0;
    };

    /**
     * Tests if this Long's value equals the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Long.prototype.equals = function(other) {
        if (!Long.isLong(other))
            other = Long.fromValue(other);
        if (this.unsigned !== other.unsigned && (this.high >>> 31) === 1 && (other.high >>> 31) === 1)
            return false;
        return this.high === other.high && this.low === other.low;
    };

    /**
     * Tests if this Long's value differs from the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Long.prototype.notEquals = function(other) {
        if (!Long.isLong(other))
            other = Long.fromValue(other);
        return !this.equals(other);
    };

    /**
     * Tests if this Long's value is less than the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Long.prototype.lessThan = function(other) {
        if (!Long.isLong(other))
            other = Long.fromValue(other);
        return this.compare(other) < 0;
    };

    /**
     * Tests if this Long's value is less than or equal the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Long.prototype.lessThanOrEqual = function(other) {
        if (!Long.isLong(other))
            other = Long.fromValue(other);
        return this.compare(other) <= 0;
    };

    /**
     * Tests if this Long's value is greater than the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Long.prototype.greaterThan = function(other) {
        if (!Long.isLong(other))
            other = Long.fromValue(other);
        return this.compare(other) > 0;
    };

    /**
     * Tests if this Long's value is greater than or equal the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     * @expose
     */
    Long.prototype.greaterThanOrEqual = function(other) {
        return this.compare(other) >= 0;
    };

    /**
     * Compares this Long's value with the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {number} 0 if they are the same, 1 if the this is greater and -1
     *  if the given one is greater
     * @expose
     */
    Long.prototype.compare = function(other) {
        if (this.equals(other))
            return 0;
        var thisNeg = this.isNegative(),
            otherNeg = other.isNegative();
        if (thisNeg && !otherNeg)
            return -1;
        if (!thisNeg && otherNeg)
            return 1;
        // At this point the sign bits are the same
        if (!this.unsigned)
            return this.subtract(other).isNegative() ? -1 : 1;
        // Both are positive if at least one is unsigned
        return (other.high >>> 0) > (this.high >>> 0) || (other.high === this.high && (other.low >>> 0) > (this.low >>> 0)) ? -1 : 1;
    };

    /**
     * Negates this Long's value.
     * @returns {!Long} Negated Long
     * @expose
     */
    Long.prototype.negate = function() {
        if (!this.unsigned && this.equals(Long.MIN_VALUE))
            return Long.MIN_VALUE;
        return this.not().add(Long.ONE);
    };

    /**
     * Returns the sum of this and the specified Long.
     * @param {!Long|number|string} addend Addend
     * @returns {!Long} Sum
     * @expose
     */
    Long.prototype.add = function(addend) {
        if (!Long.isLong(addend))
            addend = Long.fromValue(addend);

        // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = addend.high >>> 16;
        var b32 = addend.high & 0xFFFF;
        var b16 = addend.low >>> 16;
        var b00 = addend.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 + b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 + b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 + b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 + b48;
        c48 &= 0xFFFF;
        return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    };

    /**
     * Returns the difference of this and the specified Long.
     * @param {!Long|number|string} subtrahend Subtrahend
     * @returns {!Long} Difference
     * @expose
     */
    Long.prototype.subtract = function(subtrahend) {
        if (!Long.isLong(subtrahend))
            subtrahend = Long.fromValue(subtrahend);
        return this.add(subtrahend.negate());
    };

    /**
     * Returns the product of this and the specified Long.
     * @param {!Long|number|string} multiplier Multiplier
     * @returns {!Long} Product
     * @expose
     */
    Long.prototype.multiply = function(multiplier) {
        if (this.isZero())
            return Long.ZERO;
        if (!Long.isLong(multiplier))
            multiplier = Long.fromValue(multiplier);
        if (multiplier.isZero())
            return Long.ZERO;
        if (this.equals(Long.MIN_VALUE))
            return multiplier.isOdd() ? Long.MIN_VALUE : Long.ZERO;
        if (multiplier.equals(Long.MIN_VALUE))
            return this.isOdd() ? Long.MIN_VALUE : Long.ZERO;

        if (this.isNegative()) {
            if (multiplier.isNegative())
                return this.negate().multiply(multiplier.negate());
            else
                return this.negate().multiply(multiplier).negate();
        } else if (multiplier.isNegative())
            return this.multiply(multiplier.negate()).negate();

        // If both longs are small, use float multiplication
        if (this.lessThan(TWO_PWR_24) && multiplier.lessThan(TWO_PWR_24))
            return Long.fromNumber(this.toNumber() * multiplier.toNumber(), this.unsigned);

        // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
        // We can skip products that would overflow.

        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = multiplier.high >>> 16;
        var b32 = multiplier.high & 0xFFFF;
        var b16 = multiplier.low >>> 16;
        var b00 = multiplier.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 * b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 * b00;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c16 += a00 * b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 * b00;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a16 * b16;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a00 * b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
        c48 &= 0xFFFF;
        return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    };

    /**
     * Returns this Long divided by the specified.
     * @param {!Long|number|string} divisor Divisor
     * @returns {!Long} Quotient
     * @expose
     */
    Long.prototype.div = function(divisor) {
        if (!Long.isLong(divisor))
            divisor = Long.fromValue(divisor);
        if (divisor.isZero())
            throw(new Error('division by zero'));
        if (this.isZero())
            return this.unsigned ? Long.UZERO : Long.ZERO;
        var approx, rem, res;
        if (this.equals(Long.MIN_VALUE)) {
            if (divisor.equals(Long.ONE) || divisor.equals(Long.NEG_ONE))
                return Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
            else if (divisor.equals(Long.MIN_VALUE))
                return Long.ONE;
            else {
                // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                var halfThis = this.shiftRight(1);
                approx = halfThis.div(divisor).shiftLeft(1);
                if (approx.equals(Long.ZERO)) {
                    return divisor.isNegative() ? Long.ONE : Long.NEG_ONE;
                } else {
                    rem = this.subtract(divisor.multiply(approx));
                    res = approx.add(rem.div(divisor));
                    return res;
                }
            }
        } else if (divisor.equals(Long.MIN_VALUE))
            return this.unsigned ? Long.UZERO : Long.ZERO;
        if (this.isNegative()) {
            if (divisor.isNegative())
                return this.negate().div(divisor.negate());
            return this.negate().div(divisor).negate();
        } else if (divisor.isNegative())
            return this.div(divisor.negate()).negate();

        // Repeat the following until the remainder is less than other:  find a
        // floating-point that approximates remainder / other *from below*, add this
        // into the result, and subtract it from the remainder.  It is critical that
        // the approximate value is less than or equal to the real value so that the
        // remainder never becomes negative.
        res = Long.ZERO;
        rem = this;
        while (rem.greaterThanOrEqual(divisor)) {
            // Approximate the result of division. This may be a little greater or
            // smaller than the actual value.
            approx = Math.max(1, Math.floor(rem.toNumber() / divisor.toNumber()));

            // We will tweak the approximate result by changing it in the 48-th digit or
            // the smallest non-fractional digit, whichever is larger.
            var log2 = Math.ceil(Math.log(approx) / Math.LN2),
                delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48),

            // Decrease the approximation until it is smaller than the remainder.  Note
            // that if it is too large, the product overflows and is negative.
                approxRes = Long.fromNumber(approx),
                approxRem = approxRes.multiply(divisor);
            while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
                approx -= delta;
                approxRes = Long.fromNumber(approx, this.unsigned);
                approxRem = approxRes.multiply(divisor);
            }

            // We know the answer can't be zero... and actually, zero would cause
            // infinite recursion since we would make no progress.
            if (approxRes.isZero())
                approxRes = Long.ONE;

            res = res.add(approxRes);
            rem = rem.subtract(approxRem);
        }
        return res;
    };

    /**
     * Returns this Long modulo the specified.
     * @param {!Long|number|string} divisor Divisor
     * @returns {!Long} Remainder
     * @expose
     */
    Long.prototype.modulo = function(divisor) {
        if (!Long.isLong(divisor))
            divisor = Long.fromValue(divisor);
        return this.subtract(this.div(divisor).multiply(divisor));
    };

    /**
     * Returns the bitwise NOT of this Long.
     * @returns {!Long}
     * @expose
     */
    Long.prototype.not = function() {
        return Long.fromBits(~this.low, ~this.high, this.unsigned);
    };

    /**
     * Returns the bitwise AND of this Long and the specified.
     * @param {!Long|number|string} other Other Long
     * @returns {!Long}
     * @expose
     */
    Long.prototype.and = function(other) {
        if (!Long.isLong(other))
            other = Long.fromValue(other);
        return Long.fromBits(this.low & other.low, this.high & other.high, this.unsigned);
    };

    /**
     * Returns the bitwise OR of this Long and the specified.
     * @param {!Long|number|string} other Other Long
     * @returns {!Long}
     * @expose
     */
    Long.prototype.or = function(other) {
        if (!Long.isLong(other))
            other = Long.fromValue(other);
        return Long.fromBits(this.low | other.low, this.high | other.high, this.unsigned);
    };

    /**
     * Returns the bitwise XOR of this Long and the given one.
     * @param {!Long|number|string} other Other Long
     * @returns {!Long}
     * @expose
     */
    Long.prototype.xor = function(other) {
        if (!Long.isLong(other))
            other = Long.fromValue(other);
        return Long.fromBits(this.low ^ other.low, this.high ^ other.high, this.unsigned);
    };

    /**
     * Returns this Long with bits shifted to the left by the given amount.
     * @param {number|!Long} numBits Number of bits
     * @returns {!Long} Shifted Long
     * @expose
     */
    Long.prototype.shiftLeft = function(numBits) {
        if (Long.isLong(numBits))
            numBits = numBits.toInt();
        if ((numBits &= 63) === 0)
            return this;
        else if (numBits < 32)
            return Long.fromBits(this.low << numBits, (this.high << numBits) | (this.low >>> (32 - numBits)), this.unsigned);
        else
            return Long.fromBits(0, this.low << (numBits - 32), this.unsigned);
    };

    /**
     * Returns this Long with bits arithmetically shifted to the right by the given amount.
     * @param {number|!Long} numBits Number of bits
     * @returns {!Long} Shifted Long
     * @expose
     */
    Long.prototype.shiftRight = function(numBits) {
        if (Long.isLong(numBits))
            numBits = numBits.toInt();
        if ((numBits &= 63) === 0)
            return this;
        else if (numBits < 32)
            return Long.fromBits((this.low >>> numBits) | (this.high << (32 - numBits)), this.high >> numBits, this.unsigned);
        else
            return Long.fromBits(this.high >> (numBits - 32), this.high >= 0 ? 0 : -1, this.unsigned);
    };

    /**
     * Returns this Long with bits logically shifted to the right by the given amount.
     * @param {number|!Long} numBits Number of bits
     * @returns {!Long} Shifted Long
     * @expose
     */
    Long.prototype.shiftRightUnsigned = function(numBits) {
        if (Long.isLong(numBits))
            numBits = numBits.toInt();
        numBits &= 63;
        if (numBits === 0)
            return this;
        else {
            var high = this.high;
            if (numBits < 32) {
                var low = this.low;
                return Long.fromBits((low >>> numBits) | (high << (32 - numBits)), high >>> numBits, this.unsigned);
            } else if (numBits === 32)
                return Long.fromBits(high, 0, this.unsigned);
            else
                return Long.fromBits(high >>> (numBits - 32), 0, this.unsigned);
        }
    };

    /**
     * Converts this Long to signed.
     * @returns {!Long} Signed long
     * @expose
     */
    Long.prototype.toSigned = function() {
        if (!this.unsigned)
            return this;
        return new Long(this.low, this.high, false);
    };

    /**
     * Converts this Long to unsigned.
     * @returns {!Long} Unsigned long
     * @expose
     */
    Long.prototype.toUnsigned = function() {
        if (this.unsigned)
            return this;
        return new Long(this.low, this.high, true);
    };

    /* CommonJS */ if (typeof require === 'function' && typeof module === 'object' && module && typeof exports === 'object' && exports)
        module["exports"] = Long;
    /* AMD */ else if (typeof define === 'function' && define["amd"])
        define(function() { return Long; });
    /* Global */ else
        (global["dcodeIO"] = global["dcodeIO"] || {})["Long"] = Long;

})(this);
/*
 Copyright 2013-2014 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license ByteBuffer.js (c) 2013-2014 Daniel Wirtz <dcode@dcode.io>
 * This version of ByteBuffer.js uses an ArrayBuffer (AB) as its backing buffer and is compatible with modern browsers.
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/ByteBuffer.js for details
 */ //
(function(global) {
    "use strict";

    /**
     * @param {function(new: Long, number, number, boolean=)=} Long
     * @returns {function(new: ByteBuffer, number=, boolean=, boolean=)}}
     * @inner
     */
    function loadByteBuffer(Long) {

        /**
         * Constructs a new ByteBuffer.
         * @class The swiss army knife for binary data in JavaScript.
         * @exports ByteBuffer
         * @constructor
         * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @expose
         */
        var ByteBuffer = function(capacity, littleEndian, noAssert) {
            if (typeof capacity     === 'undefined') capacity     = ByteBuffer.DEFAULT_CAPACITY;
            if (typeof littleEndian === 'undefined') littleEndian = ByteBuffer.DEFAULT_ENDIAN;
            if (typeof noAssert     === 'undefined') noAssert     = ByteBuffer.DEFAULT_NOASSERT;
            if (!noAssert) {
                capacity = capacity | 0;
                if (capacity < 0)
                    throw RangeError("Illegal capacity");
                littleEndian = !!littleEndian;
                noAssert = !!noAssert;
            }

            /**
             * Backing buffer.
             * @type {!ArrayBuffer}
             * @expose
             */
            this.buffer = capacity === 0 ? EMPTY_BUFFER : new ArrayBuffer(capacity);

            /**
             * Data view to manipulate the backing buffer. Becomes `null` if the backing buffer has a capacity of `0`.
             * @type {?DataView}
             * @expose
             */
            this.view = capacity === 0 ? null : new DataView(this.buffer);

            /**
             * Absolute read/write offset.
             * @type {number}
             * @expose
             * @see ByteBuffer#flip
             * @see ByteBuffer#clear
             */
            this.offset = 0;

            /**
             * Marked offset.
             * @type {number}
             * @expose
             * @see ByteBuffer#mark
             * @see ByteBuffer#reset
             */
            this.markedOffset = -1;

            /**
             * Absolute limit of the contained data. Set to the backing buffer's capacity upon allocation.
             * @type {number}
             * @expose
             * @see ByteBuffer#flip
             * @see ByteBuffer#clear
             */
            this.limit = capacity;

            /**
             * Whether to use little endian byte order, defaults to `false` for big endian.
             * @type {boolean}
             * @expose
             */
            this.littleEndian = typeof littleEndian !== 'undefined' ? !!littleEndian : false;

            /**
             * Whether to skip assertions of offsets and values, defaults to `false`.
             * @type {boolean}
             * @expose
             */
            this.noAssert = !!noAssert;
        };

        /**
         * ByteBuffer version.
         * @type {string}
         * @const
         * @expose
         */
        ByteBuffer.VERSION = "3.5.4";

        /**
         * Little endian constant that can be used instead of its boolean value. Evaluates to `true`.
         * @type {boolean}
         * @const
         * @expose
         */
        ByteBuffer.LITTLE_ENDIAN = true;

        /**
         * Big endian constant that can be used instead of its boolean value. Evaluates to `false`.
         * @type {boolean}
         * @const
         * @expose
         */
        ByteBuffer.BIG_ENDIAN = false;

        /**
         * Default initial capacity of `16`.
         * @type {number}
         * @expose
         */
        ByteBuffer.DEFAULT_CAPACITY = 16;

        /**
         * Default endianess of `false` for big endian.
         * @type {boolean}
         * @expose
         */
        ByteBuffer.DEFAULT_ENDIAN = ByteBuffer.BIG_ENDIAN;

        /**
         * Default no assertions flag of `false`.
         * @type {boolean}
         * @expose
         */
        ByteBuffer.DEFAULT_NOASSERT = false;

        /**
         * A `Long` class for representing a 64-bit two's-complement integer value. May be `null` if Long.js has not been loaded
         *  and int64 support is not available.
         * @type {?Long}
         * @const
         * @see https://github.com/dcodeIO/Long.js
         * @expose
         */
        ByteBuffer.Long = Long || null;

        /**
         * @alias ByteBuffer.prototype
         * @inner
         */
        var ByteBufferPrototype = ByteBuffer.prototype;

        // helpers

        /**
         * @type {!ArrayBuffer}
         * @inner
         */
        var EMPTY_BUFFER = new ArrayBuffer(0);

        /**
         * String.fromCharCode reference for compile-time renaming.
         * @type {function(...number):string}
         * @inner
         */
        var stringFromCharCode = String.fromCharCode;

        /**
         * Creates a source function for a string.
         * @param {string} s String to read from
         * @returns {function():number|null} Source function returning the next char code respectively `null` if there are
         *  no more characters left.
         * @throws {TypeError} If the argument is invalid
         * @inner
         */
        function stringSource(s) {
            var i=0; return function() {
                return i < s.length ? s.charCodeAt(i++) : null;
            };
        }

        /**
         * Creates a destination function for a string.
         * @returns {function(number=):undefined|string} Destination function successively called with the next char code.
         *  Returns the final string when called without arguments.
         * @inner
         */
        function stringDestination() {
            var cs = [], ps = []; return function() {
                if (arguments.length === 0)
                    return ps.join('')+stringFromCharCode.apply(String, cs);
                if (cs.length + arguments.length > 1024)
                    ps.push(stringFromCharCode.apply(String, cs)),
                        cs.length = 0;
                Array.prototype.push.apply(cs, arguments);
            };
        }

        /**
         * Allocates a new ByteBuffer backed by a buffer of the specified capacity.
         * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer}
         * @expose
         */
        ByteBuffer.allocate = function(capacity, littleEndian, noAssert) {
            return new ByteBuffer(capacity, littleEndian, noAssert);
        };

        /**
         * Concatenates multiple ByteBuffers into one.
         * @param {!Array.<!ByteBuffer|!ArrayBuffer|!Uint8Array|string>} buffers Buffers to concatenate
         * @param {(string|boolean)=} encoding String encoding if `buffers` contains a string ("base64", "hex", "binary",
         *  defaults to "utf8")
         * @param {boolean=} littleEndian Whether to use little or big endian byte order for the resulting ByteBuffer. Defaults
         *  to {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values for the resulting ByteBuffer. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} Concatenated ByteBuffer
         * @expose
         */
        ByteBuffer.concat = function(buffers, encoding, littleEndian, noAssert) {
            if (typeof encoding === 'boolean' || typeof encoding !== 'string') {
                noAssert = littleEndian;
                littleEndian = encoding;
                encoding = undefined;
            }
            var capacity = 0;
            for (var i=0, k=buffers.length, length; i<k; ++i) {
                if (!ByteBuffer.isByteBuffer(buffers[i]))
                    buffers[i] = ByteBuffer.wrap(buffers[i], encoding);
                length = buffers[i].limit - buffers[i].offset;
                if (length > 0) capacity += length;
            }
            if (capacity === 0)
                return new ByteBuffer(0, littleEndian, noAssert);
            var bb = new ByteBuffer(capacity, littleEndian, noAssert),
                bi;
            var view = new Uint8Array(bb.buffer);
            i=0; while (i<k) {
                bi = buffers[i++];
                length = bi.limit - bi.offset;
                if (length <= 0) continue;
                view.set(new Uint8Array(bi.buffer).subarray(bi.offset, bi.limit), bb.offset);
                bb.offset += length;
            }
            bb.limit = bb.offset;
            bb.offset = 0;
            return bb;
        };

        /**
         * Tests if the specified type is a ByteBuffer.
         * @param {*} bb ByteBuffer to test
         * @returns {boolean} `true` if it is a ByteBuffer, otherwise `false`
         * @expose
         */
        ByteBuffer.isByteBuffer = function(bb) {
            return (bb && bb instanceof ByteBuffer) === true;
        };
        /**
         * Gets the backing buffer type.
         * @returns {Function} `Buffer` for NB builds, `ArrayBuffer` for AB builds (classes)
         * @expose
         */
        ByteBuffer.type = function() {
            return ArrayBuffer;
        };

        /**
         * Wraps a buffer or a string. Sets the allocated ByteBuffer's {@link ByteBuffer#offset} to `0` and its
         *  {@link ByteBuffer#limit} to the length of the wrapped data.
         * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string|!Array.<number>} buffer Anything that can be wrapped
         * @param {(string|boolean)=} encoding String encoding if `buffer` is a string ("base64", "hex", "binary", defaults to
         *  "utf8")
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} A ByteBuffer wrapping `buffer`
         * @expose
         */
        ByteBuffer.wrap = function(buffer, encoding, littleEndian, noAssert) {
            if (typeof encoding !== 'string') {
                noAssert = littleEndian;
                littleEndian = encoding;
                encoding = undefined;
            }
            if (typeof buffer === 'string') {
                if (typeof encoding === 'undefined')
                    encoding = "utf8";
                switch (encoding) {
                    case "base64":
                        return ByteBuffer.fromBase64(buffer, littleEndian);
                    case "hex":
                        return ByteBuffer.fromHex(buffer, littleEndian);
                    case "binary":
                        return ByteBuffer.fromBinary(buffer, littleEndian);
                    case "utf8":
                        return ByteBuffer.fromUTF8(buffer, littleEndian);
                    case "debug":
                        return ByteBuffer.fromDebug(buffer, littleEndian);
                    default:
                        throw Error("Unsupported encoding: "+encoding);
                }
            }
            if (buffer === null || typeof buffer !== 'object')
                throw TypeError("Illegal buffer");
            var bb;
            if (ByteBuffer.isByteBuffer(buffer)) {
                bb = ByteBufferPrototype.clone.call(buffer);
                bb.markedOffset = -1;
                return bb;
            }
            if (buffer instanceof Uint8Array) { // Extract ArrayBuffer from Uint8Array
                bb = new ByteBuffer(0, littleEndian, noAssert);
                if (buffer.length > 0) { // Avoid references to more than one EMPTY_BUFFER
                    bb.buffer = buffer.buffer;
                    bb.offset = buffer.byteOffset;
                    bb.limit = buffer.byteOffset + buffer.length;
                    bb.view = buffer.length > 0 ? new DataView(buffer.buffer) : null;
                }
            } else if (buffer instanceof ArrayBuffer) { // Reuse ArrayBuffer
                bb = new ByteBuffer(0, littleEndian, noAssert);
                if (buffer.byteLength > 0) {
                    bb.buffer = buffer;
                    bb.offset = 0;
                    bb.limit = buffer.byteLength;
                    bb.view = buffer.byteLength > 0 ? new DataView(buffer) : null;
                }
            } else if (Object.prototype.toString.call(buffer) === "[object Array]") { // Create from octets
                bb = new ByteBuffer(buffer.length, littleEndian, noAssert);
                bb.limit = buffer.length;
                for (i=0; i<buffer.length; ++i)
                    bb.view.setUint8(i, buffer[i]);
            } else
                throw TypeError("Illegal buffer"); // Otherwise fail
            return bb;
        };

        // types/ints/int8

        /**
         * Writes an 8bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeInt8 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 1;
            var capacity0 = this.buffer.byteLength;
            if (offset > capacity0)
                this.resize((capacity0 *= 2) > offset ? capacity0 : offset);
            offset -= 1;
            this.view.setInt8(offset, value);
            if (relative) this.offset += 1;
            return this;
        };

        /**
         * Writes an 8bit signed integer. This is an alias of {@link ByteBuffer#writeInt8}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeByte = ByteBufferPrototype.writeInt8;

        /**
         * Reads an 8bit signed integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readInt8 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getInt8(offset);
            if (relative) this.offset += 1;
            return value;
        };

        /**
         * Reads an 8bit signed integer. This is an alias of {@link ByteBuffer#readInt8}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readByte = ByteBufferPrototype.readInt8;

        /**
         * Writes an 8bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeUint8 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value >>>= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 1;
            var capacity1 = this.buffer.byteLength;
            if (offset > capacity1)
                this.resize((capacity1 *= 2) > offset ? capacity1 : offset);
            offset -= 1;
            this.view.setUint8(offset, value);
            if (relative) this.offset += 1;
            return this;
        };

        /**
         * Reads an 8bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readUint8 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getUint8(offset);
            if (relative) this.offset += 1;
            return value;
        };

        // types/ints/int16

        /**
         * Writes a 16bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @throws {TypeError} If `offset` or `value` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.writeInt16 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 2;
            var capacity2 = this.buffer.byteLength;
            if (offset > capacity2)
                this.resize((capacity2 *= 2) > offset ? capacity2 : offset);
            offset -= 2;
            this.view.setInt16(offset, value, this.littleEndian);
            if (relative) this.offset += 2;
            return this;
        };

        /**
         * Writes a 16bit signed integer. This is an alias of {@link ByteBuffer#writeInt16}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @throws {TypeError} If `offset` or `value` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.writeShort = ByteBufferPrototype.writeInt16;

        /**
         * Reads a 16bit signed integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @returns {number} Value read
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.readInt16 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 2 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+2+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getInt16(offset, this.littleEndian);
            if (relative) this.offset += 2;
            return value;
        };

        /**
         * Reads a 16bit signed integer. This is an alias of {@link ByteBuffer#readInt16}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @returns {number} Value read
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.readShort = ByteBufferPrototype.readInt16;

        /**
         * Writes a 16bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @throws {TypeError} If `offset` or `value` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.writeUint16 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value >>>= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 2;
            var capacity3 = this.buffer.byteLength;
            if (offset > capacity3)
                this.resize((capacity3 *= 2) > offset ? capacity3 : offset);
            offset -= 2;
            this.view.setUint16(offset, value, this.littleEndian);
            if (relative) this.offset += 2;
            return this;
        };

        /**
         * Reads a 16bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @returns {number} Value read
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.readUint16 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 2 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+2+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getUint16(offset, this.littleEndian);
            if (relative) this.offset += 2;
            return value;
        };

        // types/ints/int32

        /**
         * Writes a 32bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @expose
         */
        ByteBufferPrototype.writeInt32 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 4;
            var capacity4 = this.buffer.byteLength;
            if (offset > capacity4)
                this.resize((capacity4 *= 2) > offset ? capacity4 : offset);
            offset -= 4;
            this.view.setInt32(offset, value, this.littleEndian);
            if (relative) this.offset += 4;
            return this;
        };

        /**
         * Writes a 32bit signed integer. This is an alias of {@link ByteBuffer#writeInt32}.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @expose
         */
        ByteBufferPrototype.writeInt = ByteBufferPrototype.writeInt32;

        /**
         * Reads a 32bit signed integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readInt32 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getInt32(offset, this.littleEndian);
            if (relative) this.offset += 4;
            return value;
        };

        /**
         * Reads a 32bit signed integer. This is an alias of {@link ByteBuffer#readInt32}.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readInt = ByteBufferPrototype.readInt32;

        /**
         * Writes a 32bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @expose
         */
        ByteBufferPrototype.writeUint32 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value >>>= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 4;
            var capacity5 = this.buffer.byteLength;
            if (offset > capacity5)
                this.resize((capacity5 *= 2) > offset ? capacity5 : offset);
            offset -= 4;
            this.view.setUint32(offset, value, this.littleEndian);
            if (relative) this.offset += 4;
            return this;
        };

        /**
         * Reads a 32bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readUint32 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getUint32(offset, this.littleEndian);
            if (relative) this.offset += 4;
            return value;
        };

        // types/ints/int64

        if (Long) {

            /**
             * Writes a 64bit signed integer.
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeInt64 = function(value, offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof value === 'number')
                        value = Long.fromNumber(value);
                    else if (!(value && value instanceof Long))
                        throw TypeError("Illegal value: "+value+" (not an integer or Long)");
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 0 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
                }
                if (typeof value === 'number')
                    value = Long.fromNumber(value);
                offset += 8;
                var capacity6 = this.buffer.byteLength;
                if (offset > capacity6)
                    this.resize((capacity6 *= 2) > offset ? capacity6 : offset);
                offset -= 8;
                if (this.littleEndian) {
                    this.view.setInt32(offset  , value.low , true);
                    this.view.setInt32(offset+4, value.high, true);
                } else {
                    this.view.setInt32(offset  , value.high, false);
                    this.view.setInt32(offset+4, value.low , false);
                }
                if (relative) this.offset += 8;
                return this;
            };

            /**
             * Writes a 64bit signed integer. This is an alias of {@link ByteBuffer#writeInt64}.
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeLong = ByteBufferPrototype.writeInt64;

            /**
             * Reads a 64bit signed integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!Long}
             * @expose
             */
            ByteBufferPrototype.readInt64 = function(offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 8 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength);
                }
                var value = this.littleEndian
                    ? new Long(this.view.getInt32(offset  , true ), this.view.getInt32(offset+4, true ), false)
                    : new Long(this.view.getInt32(offset+4, false), this.view.getInt32(offset  , false), false);
                if (relative) this.offset += 8;
                return value;
            };

            /**
             * Reads a 64bit signed integer. This is an alias of {@link ByteBuffer#readInt64}.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!Long}
             * @expose
             */
            ByteBufferPrototype.readLong = ByteBufferPrototype.readInt64;

            /**
             * Writes a 64bit unsigned integer.
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeUint64 = function(value, offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof value === 'number')
                        value = Long.fromNumber(value);
                    else if (!(value && value instanceof Long))
                        throw TypeError("Illegal value: "+value+" (not an integer or Long)");
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 0 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
                }
                if (typeof value === 'number')
                    value = Long.fromNumber(value);
                offset += 8;
                var capacity7 = this.buffer.byteLength;
                if (offset > capacity7)
                    this.resize((capacity7 *= 2) > offset ? capacity7 : offset);
                offset -= 8;
                if (this.littleEndian) {
                    this.view.setInt32(offset  , value.low , true);
                    this.view.setInt32(offset+4, value.high, true);
                } else {
                    this.view.setInt32(offset  , value.high, false);
                    this.view.setInt32(offset+4, value.low , false);
                }
                if (relative) this.offset += 8;
                return this;
            };

            /**
             * Reads a 64bit unsigned integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!Long}
             * @expose
             */
            ByteBufferPrototype.readUint64 = function(offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 8 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength);
                }
                var value = this.littleEndian
                    ? new Long(this.view.getInt32(offset  , true ), this.view.getInt32(offset+4, true ), true)
                    : new Long(this.view.getInt32(offset+4, false), this.view.getInt32(offset  , false), true);
                if (relative) this.offset += 8;
                return value;
            };

        } // Long


        // types/floats/float32

        /**
         * Writes a 32bit float.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeFloat32 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number')
                    throw TypeError("Illegal value: "+value+" (not a number)");
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 4;
            var capacity8 = this.buffer.byteLength;
            if (offset > capacity8)
                this.resize((capacity8 *= 2) > offset ? capacity8 : offset);
            offset -= 4;
            this.view.setFloat32(offset, value, this.littleEndian);
            if (relative) this.offset += 4;
            return this;
        };

        /**
         * Writes a 32bit float. This is an alias of {@link ByteBuffer#writeFloat32}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeFloat = ByteBufferPrototype.writeFloat32;

        /**
         * Reads a 32bit float.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBufferPrototype.readFloat32 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getFloat32(offset, this.littleEndian);
            if (relative) this.offset += 4;
            return value;
        };

        /**
         * Reads a 32bit float. This is an alias of {@link ByteBuffer#readFloat32}.
         * @function
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBufferPrototype.readFloat = ByteBufferPrototype.readFloat32;

        // types/floats/float64

        /**
         * Writes a 64bit float.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeFloat64 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number')
                    throw TypeError("Illegal value: "+value+" (not a number)");
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 8;
            var capacity9 = this.buffer.byteLength;
            if (offset > capacity9)
                this.resize((capacity9 *= 2) > offset ? capacity9 : offset);
            offset -= 8;
            this.view.setFloat64(offset, value, this.littleEndian);
            if (relative) this.offset += 8;
            return this;
        };

        /**
         * Writes a 64bit float. This is an alias of {@link ByteBuffer#writeFloat64}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeDouble = ByteBufferPrototype.writeFloat64;

        /**
         * Reads a 64bit float.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBufferPrototype.readFloat64 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 8 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getFloat64(offset, this.littleEndian);
            if (relative) this.offset += 8;
            return value;
        };

        /**
         * Reads a 64bit float. This is an alias of {@link ByteBuffer#readFloat64}.
         * @function
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBufferPrototype.readDouble = ByteBufferPrototype.readFloat64;


        // types/varints/varint32

        /**
         * Maximum number of bytes required to store a 32bit base 128 variable-length integer.
         * @type {number}
         * @const
         * @expose
         */
        ByteBuffer.MAX_VARINT32_BYTES = 5;

        /**
         * Calculates the actual number of bytes required to store a 32bit base 128 variable-length integer.
         * @param {number} value Value to encode
         * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT32_BYTES}
         * @expose
         */
        ByteBuffer.calculateVarint32 = function(value) {
            // ref: src/google/protobuf/io/coded_stream.cc
            value = value >>> 0;
                 if (value < 1 << 7 ) return 1;
            else if (value < 1 << 14) return 2;
            else if (value < 1 << 21) return 3;
            else if (value < 1 << 28) return 4;
            else                      return 5;
        };

        /**
         * Zigzag encodes a signed 32bit integer so that it can be effectively used with varint encoding.
         * @param {number} n Signed 32bit integer
         * @returns {number} Unsigned zigzag encoded 32bit integer
         * @expose
         */
        ByteBuffer.zigZagEncode32 = function(n) {
            return (((n |= 0) << 1) ^ (n >> 31)) >>> 0; // ref: src/google/protobuf/wire_format_lite.h
        };

        /**
         * Decodes a zigzag encoded signed 32bit integer.
         * @param {number} n Unsigned zigzag encoded 32bit integer
         * @returns {number} Signed 32bit integer
         * @expose
         */
        ByteBuffer.zigZagDecode32 = function(n) {
            return ((n >>> 1) ^ -(n & 1)) | 0; // // ref: src/google/protobuf/wire_format_lite.h
        };

        /**
         * Writes a 32bit base 128 variable-length integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBufferPrototype.writeVarint32 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var size = ByteBuffer.calculateVarint32(value),
                b;
            offset += size;
            var capacity10 = this.buffer.byteLength;
            if (offset > capacity10)
                this.resize((capacity10 *= 2) > offset ? capacity10 : offset);
            offset -= size;
            // ref: http://code.google.com/searchframe#WTeibokF6gE/trunk/src/google/protobuf/io/coded_stream.cc
            this.view.setUint8(offset, b = value | 0x80);
            value >>>= 0;
            if (value >= 1 << 7) {
                b = (value >> 7) | 0x80;
                this.view.setUint8(offset+1, b);
                if (value >= 1 << 14) {
                    b = (value >> 14) | 0x80;
                    this.view.setUint8(offset+2, b);
                    if (value >= 1 << 21) {
                        b = (value >> 21) | 0x80;
                        this.view.setUint8(offset+3, b);
                        if (value >= 1 << 28) {
                            this.view.setUint8(offset+4, (value >> 28) & 0x0F);
                            size = 5;
                        } else {
                            this.view.setUint8(offset+3, b & 0x7F);
                            size = 4;
                        }
                    } else {
                        this.view.setUint8(offset+2, b & 0x7F);
                        size = 3;
                    }
                } else {
                    this.view.setUint8(offset+1, b & 0x7F);
                    size = 2;
                }
            } else {
                this.view.setUint8(offset, b & 0x7F);
                size = 1;
            }
            if (relative) {
                this.offset += size;
                return this;
            }
            return size;
        };

        /**
         * Writes a zig-zag encoded 32bit base 128 variable-length integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBufferPrototype.writeVarint32ZigZag = function(value, offset) {
            return this.writeVarint32(ByteBuffer.zigZagEncode32(value), offset);
        };

        /**
         * Reads a 32bit base 128 variable-length integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
         *  and the actual number of bytes read.
         * @throws {Error} If it's not a valid varint. Has a property `truncated = true` if there is not enough data available
         *  to fully decode the varint.
         * @expose
         */
        ByteBufferPrototype.readVarint32 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            // ref: src/google/protobuf/io/coded_stream.cc
            var size = 0,
                value = 0 >>> 0,
                temp,
                ioffset;
            do {
                ioffset = offset+size;
                if (!this.noAssert && ioffset > this.limit) {
                    var err = Error("Truncated");
                    err['truncated'] = true;
                    throw err;
                }
                temp = this.view.getUint8(ioffset);
                if (size < 5)
                    value |= ((temp&0x7F)<<(7*size)) >>> 0;
                ++size;
            } while ((temp & 0x80) === 0x80);
            value = value | 0; // Make sure to discard the higher order bits
            if (relative) {
                this.offset += size;
                return value;
            }
            return {
                "value": value,
                "length": size
            };
        };

        /**
         * Reads a zig-zag encoded 32bit base 128 variable-length integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
         *  and the actual number of bytes read.
         * @throws {Error} If it's not a valid varint
         * @expose
         */
        ByteBufferPrototype.readVarint32ZigZag = function(offset) {
            var val = this.readVarint32(offset);
            if (typeof val === 'object')
                val["value"] = ByteBuffer.zigZagDecode32(val["value"]);
            else
                val = ByteBuffer.zigZagDecode32(val);
            return val;
        };

        // types/varints/varint64

        if (Long) {

            /**
             * Maximum number of bytes required to store a 64bit base 128 variable-length integer.
             * @type {number}
             * @const
             * @expose
             */
            ByteBuffer.MAX_VARINT64_BYTES = 10;

            /**
             * Calculates the actual number of bytes required to store a 64bit base 128 variable-length integer.
             * @param {number|!Long} value Value to encode
             * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT64_BYTES}
             * @expose
             */
            ByteBuffer.calculateVarint64 = function(value) {
                if (typeof value === 'number')
                    value = Long.fromNumber(value);
                // ref: src/google/protobuf/io/coded_stream.cc
                var part0 = value.toInt() >>> 0,
                    part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                    part2 = value.shiftRightUnsigned(56).toInt() >>> 0;
                if (part2 == 0) {
                    if (part1 == 0) {
                        if (part0 < 1 << 14)
                            return part0 < 1 << 7 ? 1 : 2;
                        else
                            return part0 < 1 << 21 ? 3 : 4;
                    } else {
                        if (part1 < 1 << 14)
                            return part1 < 1 << 7 ? 5 : 6;
                        else
                            return part1 < 1 << 21 ? 7 : 8;
                    }
                } else
                    return part2 < 1 << 7 ? 9 : 10;
            };

            /**
             * Zigzag encodes a signed 64bit integer so that it can be effectively used with varint encoding.
             * @param {number|!Long} value Signed long
             * @returns {!Long} Unsigned zigzag encoded long
             * @expose
             */
            ByteBuffer.zigZagEncode64 = function(value) {
                if (typeof value === 'number')
                    value = Long.fromNumber(value, false);
                else if (value.unsigned !== false) value = value.toSigned();
                // ref: src/google/protobuf/wire_format_lite.h
                return value.shiftLeft(1).xor(value.shiftRight(63)).toUnsigned();
            };

            /**
             * Decodes a zigzag encoded signed 64bit integer.
             * @param {!Long|number} value Unsigned zigzag encoded long or JavaScript number
             * @returns {!Long} Signed long
             * @expose
             */
            ByteBuffer.zigZagDecode64 = function(value) {
                if (typeof value === 'number')
                    value = Long.fromNumber(value, false);
                else if (value.unsigned !== false) value = value.toSigned();
                // ref: src/google/protobuf/wire_format_lite.h
                return value.shiftRightUnsigned(1).xor(value.and(Long.ONE).toSigned().negate()).toSigned();
            };

            /**
             * Writes a 64bit base 128 variable-length integer.
             * @param {number|Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBufferPrototype.writeVarint64 = function(value, offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof value === 'number')
                        value = Long.fromNumber(value);
                    else if (!(value && value instanceof Long))
                        throw TypeError("Illegal value: "+value+" (not an integer or Long)");
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 0 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
                }
                if (typeof value === 'number')
                    value = Long.fromNumber(value, false);
                else if (value.unsigned !== false) value = value.toSigned();
                var size = ByteBuffer.calculateVarint64(value),
                    part0 = value.toInt() >>> 0,
                    part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                    part2 = value.shiftRightUnsigned(56).toInt() >>> 0;
                offset += size;
                var capacity11 = this.buffer.byteLength;
                if (offset > capacity11)
                    this.resize((capacity11 *= 2) > offset ? capacity11 : offset);
                offset -= size;
                switch (size) {
                    case 10: this.view.setUint8(offset+9, (part2 >>>  7) & 0x01);
                    case 9 : this.view.setUint8(offset+8, size !== 9 ? (part2       ) | 0x80 : (part2       ) & 0x7F);
                    case 8 : this.view.setUint8(offset+7, size !== 8 ? (part1 >>> 21) | 0x80 : (part1 >>> 21) & 0x7F);
                    case 7 : this.view.setUint8(offset+6, size !== 7 ? (part1 >>> 14) | 0x80 : (part1 >>> 14) & 0x7F);
                    case 6 : this.view.setUint8(offset+5, size !== 6 ? (part1 >>>  7) | 0x80 : (part1 >>>  7) & 0x7F);
                    case 5 : this.view.setUint8(offset+4, size !== 5 ? (part1       ) | 0x80 : (part1       ) & 0x7F);
                    case 4 : this.view.setUint8(offset+3, size !== 4 ? (part0 >>> 21) | 0x80 : (part0 >>> 21) & 0x7F);
                    case 3 : this.view.setUint8(offset+2, size !== 3 ? (part0 >>> 14) | 0x80 : (part0 >>> 14) & 0x7F);
                    case 2 : this.view.setUint8(offset+1, size !== 2 ? (part0 >>>  7) | 0x80 : (part0 >>>  7) & 0x7F);
                    case 1 : this.view.setUint8(offset  , size !== 1 ? (part0       ) | 0x80 : (part0       ) & 0x7F);
                }
                if (relative) {
                    this.offset += size;
                    return this;
                } else {
                    return size;
                }
            };

            /**
             * Writes a zig-zag encoded 64bit base 128 variable-length integer.
             * @param {number|Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBufferPrototype.writeVarint64ZigZag = function(value, offset) {
                return this.writeVarint64(ByteBuffer.zigZagEncode64(value), offset);
            };

            ByteBufferPrototype.readVarint64 = function(a) {
            var b = "undefined" === typeof a;
            b && (a = this.offset);
            if (!this.noAssert) {
                if ("number" !== typeof a || 0 !== a % 1) throw TypeError("Illegal offset: " + a + " (not an integer)");
                a >>>= 0;
                if (0 > a || a + 1 > this.buffer.byteLength) throw RangeError("Illegal offset: 0 <= " + a + " (+1) <= " + this.buffer.byteLength);
            }
            var c = a,
            d = 0,
            f = 0,
            e = 0,
            h = 0,
            h = this.view.getUint8(a++),
            d = h & 127;
            if (h & 128 && (h = this.view.getUint8(a++), d |= (h & 127) << 7, h & 128 && (h = this.view.getUint8(a++), d |= (h & 127) << 14, h & 128 && (h = this.view.getUint8(a++), d |= (h & 127) << 21, h & 128 && (h = this.view.getUint8(a++), f = h & 127, h & 128 && (h = this.view.getUint8(a++), f |= (h & 127) << 7, h & 128 && (h = this.view.getUint8(a++), f |= (h & 127) << 14, h & 128 && (h = this.view.getUint8(a++), f |= (h & 127) << 21, h & 128 && (h = this.view.getUint8(a++), e = h & 127, h & 128 && (h = this.view.getUint8(a++), e |= (h & 127) << 7, h & 128)))))))))) throw Error("Buffer overrun");
            d = Long.fromBits(d | f << 28, f >>> 4 | e << 24, !1);
            return b ? (this.offset = a, d) : {
                value: d,
                length: a - c
            }
        };

            /**
             * Reads a 64bit base 128 variable-length integer. Requires Long.js.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
             *  the actual number of bytes read.
             * @throws {Error} If it's not a valid varint
             * @expose
             */
            ByteBufferPrototype.readVarint64ZigZag = function(offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 1 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
                }
                // ref: src/google/protobuf/io/coded_stream.cc
                var start = offset,
                    part0 = 0,
                    part1 = 0,
                    part2 = 0,
                    b  = 0;
                b = this.view.getUint8(offset++); part0  = (b & 0x7F)      ; if (b & 0x80) {
                b = this.view.getUint8(offset++); part0 |= (b & 0x7F) <<  7; if (b & 0x80) {
                b = this.view.getUint8(offset++); part0 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = this.view.getUint8(offset++); part0 |= (b & 0x7F) << 21; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1  = (b & 0x7F)      ; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1 |= (b & 0x7F) <<  7; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1 |= (b & 0x7F) << 21; if (b & 0x80) {
                b = this.view.getUint8(offset++); part2  = (b & 0x7F)      ; if (b & 0x80) {
                b = this.view.getUint8(offset++); part2 |= (b & 0x7F) <<  7; if (b & 0x80) {
                throw Error("Buffer overrun"); }}}}}}}}}}
                var value = Long.fromBits(part0 | (part1 << 28), (part1 >>> 4) | (part2) << 24, false);
                if (relative) {
                    this.offset = offset;
                    return value;
                } else {
                    return {
                        'value': value,
                        'length': offset-start
                    };
                }
            };

            /**
             * Reads a zig-zag encoded 64bit base 128 variable-length integer. Requires Long.js.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
             *  the actual number of bytes read.
             * @throws {Error} If it's not a valid varint
             * @expose
             */
            ByteBufferPrototype.readVarint64ZigZag = function(offset) {
                var val = this.readVarint64(offset);
                if (val && val['value'] instanceof Long)
                    val["value"] = ByteBuffer.zigZagDecode64(val["value"]);
                else
                    val = ByteBuffer.zigZagDecode64(val);
                return val;
            };

        } // Long


        // types/strings/cstring

        /**
         * Writes a NULL-terminated UTF8 encoded string. For this to work the specified string must not contain any NULL
         *  characters itself.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  contained in `str` + 1 if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBufferPrototype.writeCString = function(str, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            var i,
                k = str.length;
            if (!this.noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                for (i=0; i<k; ++i) {
                    if (str.charCodeAt(i) === 0)
                        throw RangeError("Illegal str: Contains NULL-characters");
                }
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var start = offset;
            // UTF8 strings do not contain zero bytes in between except for the zero character, so:
            k = utfx.calculateUTF16asUTF8(stringSource(str))[1];
            offset += k+1;
            var capacity12 = this.buffer.byteLength;
            if (offset > capacity12)
                this.resize((capacity12 *= 2) > offset ? capacity12 : offset);
            offset -= k+1;
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                this.view.setUint8(offset++, b);
            }.bind(this));
            this.view.setUint8(offset++, 0);
            if (relative) {
                this.offset = offset - start;
                return this;
            }
            return k;
        };

        /**
         * Reads a NULL-terminated UTF8 encoded string. For this to work the string read must not contain any NULL characters
         *  itself.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         */
        ByteBufferPrototype.readCString = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            var start = offset,
                temp;
            // UTF8 strings do not contain zero bytes in between except for the zero character itself, so:
            var sd, b = -1;
            utfx.decodeUTF8toUTF16(function() {
                if (b === 0) return null;
                if (offset >= this.limit)
                    throw RangeError("Illegal range: Truncated data, "+offset+" < "+this.limit);
                return (b = this.view.getUint8(offset++)) === 0 ? null : b;
            }.bind(this), sd = stringDestination(), true);
            if (relative) {
                this.offset = offset;
                return sd();
            } else {
                return {
                    "string": sd(),
                    "length": offset - start
                };
            }
        };

        // types/strings/istring

        /**
         * Writes a length as uint32 prefixed UTF8 encoded string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
         * @expose
         * @see ByteBuffer#writeVarint32
         */
        ByteBufferPrototype.writeIString = function(str, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var start = offset,
                k;
            k = utfx.calculateUTF16asUTF8(stringSource(str), this.noAssert)[1];
            offset += 4+k;
            var capacity13 = this.buffer.byteLength;
            if (offset > capacity13)
                this.resize((capacity13 *= 2) > offset ? capacity13 : offset);
            offset -= 4+k;
            this.view.setUint32(offset, k, this.littleEndian);
            offset += 4;
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                this.view.setUint8(offset++, b);
            }.bind(this));
            if (offset !== start + 4 + k)
                throw RangeError("Illegal range: Truncated data, "+offset+" == "+(offset+4+k));
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Reads a length as uint32 prefixed UTF8 encoded string.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         * @see ByteBuffer#readVarint32
         */
        ByteBufferPrototype.readIString = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
            }
            var temp = 0,
                start = offset,
                str;
            temp = this.view.getUint32(offset, this.littleEndian);
            offset += 4;
            var k = offset + temp,
                sd;
            utfx.decodeUTF8toUTF16(function() {
                return offset < k ? this.view.getUint8(offset++) : null;
            }.bind(this), sd = stringDestination(), this.noAssert);
            str = sd();
            if (relative) {
                this.offset = offset;
                return str;
            } else {
                return {
                    'string': str,
                    'length': offset - start
                };
            }
        };

        // types/strings/utf8string

        /**
         * Metrics representing number of UTF8 characters. Evaluates to `c`.
         * @type {string}
         * @const
         * @expose
         */
        ByteBuffer.METRICS_CHARS = 'c';

        /**
         * Metrics representing number of bytes. Evaluates to `b`.
         * @type {string}
         * @const
         * @expose
         */
        ByteBuffer.METRICS_BYTES = 'b';

        /**
         * Writes an UTF8 encoded string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBufferPrototype.writeUTF8String = function(str, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var k;
            var start = offset;
            k = utfx.calculateUTF16asUTF8(stringSource(str))[1];
            offset += k;
            var capacity14 = this.buffer.byteLength;
            if (offset > capacity14)
                this.resize((capacity14 *= 2) > offset ? capacity14 : offset);
            offset -= k;
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                this.view.setUint8(offset++, b);
            }.bind(this));
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Writes an UTF8 encoded string. This is an alias of {@link ByteBuffer#writeUTF8String}.
         * @function
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBufferPrototype.writeString = ByteBufferPrototype.writeUTF8String;

        /**
         * Calculates the number of UTF8 characters of a string. JavaScript itself uses UTF-16, so that a string's
         *  `length` property does not reflect its actual UTF8 size if it contains code points larger than 0xFFFF.
         * @function
         * @param {string} str String to calculate
         * @returns {number} Number of UTF8 characters
         * @expose
         */
        ByteBuffer.calculateUTF8Chars = function(str) {
            return utfx.calculateUTF16asUTF8(stringSource(str))[0];
        };

        /**
         * Calculates the number of UTF8 bytes of a string.
         * @function
         * @param {string} str String to calculate
         * @returns {number} Number of UTF8 bytes
         * @expose
         */
        ByteBuffer.calculateUTF8Bytes = function(str) {
            return utfx.calculateUTF16asUTF8(stringSource(str))[1];
        };

        /**
         * Reads an UTF8 encoded string.
         * @param {number} length Number of characters or bytes to read.
         * @param {string=} metrics Metrics specifying what `length` is meant to count. Defaults to
         *  {@link ByteBuffer.METRICS_CHARS}.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         */
        ByteBufferPrototype.readUTF8String = function(length, metrics, offset) {
            if (typeof metrics === 'number') {
                offset = metrics;
                metrics = undefined;
            }
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (typeof metrics === 'undefined') metrics = ByteBuffer.METRICS_CHARS;
            if (!this.noAssert) {
                if (typeof length !== 'number' || length % 1 !== 0)
                    throw TypeError("Illegal length: "+length+" (not an integer)");
                length |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var i = 0,
                start = offset,
                sd;
            if (metrics === ByteBuffer.METRICS_CHARS) { // The same for node and the browser
                sd = stringDestination();
                utfx.decodeUTF8(function() {
                    return i < length && offset < this.limit ? this.view.getUint8(offset++) : null;
                }.bind(this), function(cp) {
                    ++i; utfx.UTF8toUTF16(cp, sd);
                }.bind(this));
                if (i !== length)
                    throw RangeError("Illegal range: Truncated data, "+i+" == "+length);
                if (relative) {
                    this.offset = offset;
                    return sd();
                } else {
                    return {
                        "string": sd(),
                        "length": offset - start
                    };
                }
            } else if (metrics === ByteBuffer.METRICS_BYTES) {
                if (!this.noAssert) {
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + length > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+length+") <= "+this.buffer.byteLength);
                }
                var k = offset + length;
                utfx.decodeUTF8toUTF16(function() {
                    return offset < k ? this.view.getUint8(offset++) : null;
                }.bind(this), sd = stringDestination(), this.noAssert);
                if (offset !== k)
                    throw RangeError("Illegal range: Truncated data, "+offset+" == "+k);
                if (relative) {
                    this.offset = offset;
                    return sd();
                } else {
                    return {
                        'string': sd(),
                        'length': offset - start
                    };
                }
            } else
                throw TypeError("Unsupported metrics: "+metrics);
        };

        /**
         * Reads an UTF8 encoded string. This is an alias of {@link ByteBuffer#readUTF8String}.
         * @function
         * @param {number} length Number of characters or bytes to read
         * @param {number=} metrics Metrics specifying what `n` is meant to count. Defaults to
         *  {@link ByteBuffer.METRICS_CHARS}.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         */
        ByteBufferPrototype.readString = ByteBufferPrototype.readUTF8String;

        // types/strings/vstring

        /**
         * Writes a length as varint32 prefixed UTF8 encoded string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
         * @expose
         * @see ByteBuffer#writeVarint32
         */
        ByteBufferPrototype.writeVString = function(str, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var start = offset,
                k, l;
            k = utfx.calculateUTF16asUTF8(stringSource(str), this.noAssert)[1];
            l = ByteBuffer.calculateVarint32(k);
            offset += l+k;
            var capacity15 = this.buffer.byteLength;
            if (offset > capacity15)
                this.resize((capacity15 *= 2) > offset ? capacity15 : offset);
            offset -= l+k;
            offset += this.writeVarint32(k, offset);
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                this.view.setUint8(offset++, b);
            }.bind(this));
            if (offset !== start+k+l)
                throw RangeError("Illegal range: Truncated data, "+offset+" == "+(offset+k+l));
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Reads a length as varint32 prefixed UTF8 encoded string.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         * @see ByteBuffer#readVarint32
         */
        ByteBufferPrototype.readVString = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            var temp = this.readVarint32(offset),
                start = offset,
                str;
            offset += temp['length'];
            temp = temp['value'];
            var k = offset + temp,
                sd = stringDestination();
            utfx.decodeUTF8toUTF16(function() {
                return offset < k ? this.view.getUint8(offset++) : null;
            }.bind(this), sd, this.noAssert);
            str = sd();
            if (relative) {
                this.offset = offset;
                return str;
            } else {
                return {
                    'string': str,
                    'length': offset - start
                };
            }
        };


        /**
         * Appends some data to this ByteBuffer. This will overwrite any contents behind the specified offset up to the appended
         *  data's length.
         * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string} source Data to append. If `source` is a ByteBuffer, its offsets
         *  will be modified according to the performed read operation.
         * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
         * @param {number=} offset Offset to append at. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @example A relative `<01 02>03.append(<04 05>)` will result in `<01 02 04 05>, 04 05|`
         * @example An absolute `<01 02>03.append(04 05>, 1)` will result in `<01 04>05, 04 05|`
         */
        ByteBufferPrototype.append = function(source, encoding, offset) {
            if (typeof encoding === 'number' || typeof encoding !== 'string') {
                offset = encoding;
                encoding = undefined;
            }
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            if (!(source instanceof ByteBuffer))
                source = ByteBuffer.wrap(source, encoding);
            var length = source.limit - source.offset;
            if (length <= 0) return this; // Nothing to append
            offset += length;
            var capacity16 = this.buffer.byteLength;
            if (offset > capacity16)
                this.resize((capacity16 *= 2) > offset ? capacity16 : offset);
            offset -= length;
            new Uint8Array(this.buffer, offset).set(new Uint8Array(source.buffer).subarray(source.offset, source.limit));
            source.offset += length;
            if (relative) this.offset += length;
            return this;
        };

        /**
         * Appends this ByteBuffer's contents to another ByteBuffer. This will overwrite any contents behind the specified
         *  offset up to the length of this ByteBuffer's data.
         * @param {!ByteBuffer} target Target ByteBuffer
         * @param {number=} offset Offset to append to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @see ByteBuffer#append
         */
        ByteBufferPrototype.appendTo = function(target, offset) {
            target.append(this, offset);
            return this;
        };

        /**
         * Enables or disables assertions of argument types and offsets. Assertions are enabled by default but you can opt to
         *  disable them if your code already makes sure that everything is valid.
         * @param {boolean} assert `true` to enable assertions, otherwise `false`
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.assert = function(assert) {
            this.noAssert = !assert;
            return this;
        };

        /**
         * Gets the capacity of this ByteBuffer's backing buffer.
         * @returns {number} Capacity of the backing buffer
         * @expose
         */
        ByteBufferPrototype.capacity = function() {
            return this.buffer.byteLength;
        };

        /**
         * Clears this ByteBuffer's offsets by setting {@link ByteBuffer#offset} to `0` and {@link ByteBuffer#limit} to the
         *  backing buffer's capacity. Discards {@link ByteBuffer#markedOffset}.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.clear = function() {
            this.offset = 0;
            this.limit = this.buffer.byteLength;
            this.markedOffset = -1;
            return this;
        };

        /**
         * Creates a cloned instance of this ByteBuffer, preset with this ByteBuffer's values for {@link ByteBuffer#offset},
         *  {@link ByteBuffer#markedOffset} and {@link ByteBuffer#limit}.
         * @param {boolean=} copy Whether to copy the backing buffer or to return another view on the same, defaults to `false`
         * @returns {!ByteBuffer} Cloned instance
         * @expose
         */
        ByteBufferPrototype.clone = function(copy) {
            var bb = new ByteBuffer(0, this.littleEndian, this.noAssert);
            if (copy) {
                var buffer = new ArrayBuffer(this.buffer.byteLength);
                new Uint8Array(buffer).set(this.buffer);
                bb.buffer = buffer;
                bb.view = new DataView(buffer);
            } else {
                bb.buffer = this.buffer;
                bb.view = this.view;
            }
            bb.offset = this.offset;
            bb.markedOffset = this.markedOffset;
            bb.limit = this.limit;
            return bb;
        };

        /**
         * Compacts this ByteBuffer to be backed by a {@link ByteBuffer#buffer} of its contents' length. Contents are the bytes
         *  between {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will set `offset = 0` and `limit = capacity` and
         *  adapt {@link ByteBuffer#markedOffset} to the same relative position if set.
         * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.compact = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin === 0 && end === this.buffer.byteLength)
                return this; // Already compacted
            var len = end - begin;
            if (len === 0) {
                this.buffer = EMPTY_BUFFER;
                this.view = null;
                if (this.markedOffset >= 0) this.markedOffset -= begin;
                this.offset = 0;
                this.limit = 0;
                return this;
            }
            var buffer = new ArrayBuffer(len);
            new Uint8Array(buffer).set(new Uint8Array(this.buffer).subarray(begin, end));
            this.buffer = buffer;
            this.view = new DataView(buffer);
            if (this.markedOffset >= 0) this.markedOffset -= begin;
            this.offset = 0;
            this.limit = len;
            return this;
        };

        /**
         * Creates a copy of this ByteBuffer's contents. Contents are the bytes between {@link ByteBuffer#offset} and
         *  {@link ByteBuffer#limit}.
         * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
         * @returns {!ByteBuffer} Copy
         * @expose
         */
        ByteBufferPrototype.copy = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin === end)
                return new ByteBuffer(0, this.littleEndian, this.noAssert);
            var capacity = end - begin,
                bb = new ByteBuffer(capacity, this.littleEndian, this.noAssert);
            bb.offset = 0;
            bb.limit = capacity;
            if (bb.markedOffset >= 0) bb.markedOffset -= begin;
            this.copyTo(bb, 0, begin, end);
            return bb;
        };

        /**
         * Copies this ByteBuffer's contents to another ByteBuffer. Contents are the bytes between {@link ByteBuffer#offset} and
         *  {@link ByteBuffer#limit}.
         * @param {!ByteBuffer} target Target ByteBuffer
         * @param {number=} targetOffset Offset to copy to. Will use and increase the target's {@link ByteBuffer#offset}
         *  by the number of bytes copied if omitted.
         * @param {number=} sourceOffset Offset to start copying from. Will use and increase {@link ByteBuffer#offset} by the
         *  number of bytes copied if omitted.
         * @param {number=} sourceLimit Offset to end copying from, defaults to {@link ByteBuffer#limit}
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.copyTo = function(target, targetOffset, sourceOffset, sourceLimit) {
            var relative,
                targetRelative;
            if (!this.noAssert) {
                if (!ByteBuffer.isByteBuffer(target))
                    throw TypeError("Illegal target: Not a ByteBuffer");
            }
            targetOffset = (targetRelative = typeof targetOffset === 'undefined') ? target.offset : targetOffset | 0;
            sourceOffset = (relative = typeof sourceOffset === 'undefined') ? this.offset : sourceOffset | 0;
            sourceLimit = typeof sourceLimit === 'undefined' ? this.limit : sourceLimit | 0;

            if (targetOffset < 0 || targetOffset > target.buffer.byteLength)
                throw RangeError("Illegal target range: 0 <= "+targetOffset+" <= "+target.buffer.byteLength);
            if (sourceOffset < 0 || sourceLimit > this.buffer.byteLength)
                throw RangeError("Illegal source range: 0 <= "+sourceOffset+" <= "+this.buffer.byteLength);

            var len = sourceLimit - sourceOffset;
            if (len === 0)
                return target; // Nothing to copy

            target.ensureCapacity(targetOffset + len);

            new Uint8Array(target.buffer).set(new Uint8Array(this.buffer).subarray(sourceOffset, sourceLimit), targetOffset);

            if (relative) this.offset += len;
            if (targetRelative) target.offset += len;

            return this;
        };

        /**
         * Makes sure that this ByteBuffer is backed by a {@link ByteBuffer#buffer} of at least the specified capacity. If the
         *  current capacity is exceeded, it will be doubled. If double the current capacity is less than the required capacity,
         *  the required capacity will be used instead.
         * @param {number} capacity Required capacity
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.ensureCapacity = function(capacity) {
            var current = this.buffer.byteLength;
            if (current < capacity)
                return this.resize((current *= 2) > capacity ? current : capacity);
            return this;
        };

        /**
         * Overwrites this ByteBuffer's contents with the specified value. Contents are the bytes between
         *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}.
         * @param {number|string} value Byte value to fill with. If given as a string, the first character is used.
         * @param {number=} begin Begin offset. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted. defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
         * @returns {!ByteBuffer} this
         * @expose
         * @example `someByteBuffer.clear().fill(0)` fills the entire backing buffer with zeroes
         */
        ByteBufferPrototype.fill = function(value, begin, end) {
            var relative = typeof begin === 'undefined';
            if (relative) begin = this.offset;
            if (typeof value === 'string' && value.length > 0)
                value = value.charCodeAt(0);
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin >= end)
                return this; // Nothing to fill
            while (begin < end) this.view.setUint8(begin++, value);
            if (relative) this.offset = begin;
            return this;
        };

        /**
         * Makes this ByteBuffer ready for a new sequence of write or relative read operations. Sets `limit = offset` and
         *  `offset = 0`. Make sure always to flip a ByteBuffer when all relative read or write operations are complete.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.flip = function() {
            this.limit = this.offset;
            this.offset = 0;
            return this;
        };
        /**
         * Marks an offset on this ByteBuffer to be used later.
         * @param {number=} offset Offset to mark. Defaults to {@link ByteBuffer#offset}.
         * @returns {!ByteBuffer} this
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @see ByteBuffer#reset
         * @expose
         */
        ByteBufferPrototype.mark = function(offset) {
            offset = typeof offset === 'undefined' ? this.offset : offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            this.markedOffset = offset;
            return this;
        };
        /**
         * Sets the byte order.
         * @param {boolean} littleEndian `true` for little endian byte order, `false` for big endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.order = function(littleEndian) {
            if (!this.noAssert) {
                if (typeof littleEndian !== 'boolean')
                    throw TypeError("Illegal littleEndian: Not a boolean");
            }
            this.littleEndian = !!littleEndian;
            return this;
        };

        /**
         * Switches (to) little endian byte order.
         * @param {boolean=} littleEndian Defaults to `true`, otherwise uses big endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.LE = function(littleEndian) {
            this.littleEndian = typeof littleEndian !== 'undefined' ? !!littleEndian : true;
            return this;
        };

        /**
         * Switches (to) big endian byte order.
         * @param {boolean=} bigEndian Defaults to `true`, otherwise uses little endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.BE = function(bigEndian) {
            this.littleEndian = typeof bigEndian !== 'undefined' ? !bigEndian : false;
            return this;
        };
        /**
         * Prepends some data to this ByteBuffer. This will overwrite any contents before the specified offset up to the
         *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
         *  will be resized and its contents moved accordingly.
         * @param {!ByteBuffer|string|!ArrayBuffer} source Data to prepend. If `source` is a ByteBuffer, its offset will be
         *  modified according to the performed read operation.
         * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
         * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
         *  prepended if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @example A relative `00<01 02 03>.prepend(<04 05>)` results in `<04 05 01 02 03>, 04 05|`
         * @example An absolute `00<01 02 03>.prepend(<04 05>, 2)` results in `04<05 02 03>, 04 05|`
         */
        ByteBufferPrototype.prepend = function(source, encoding, offset) {
            if (typeof encoding === 'number' || typeof encoding !== 'string') {
                offset = encoding;
                encoding = undefined;
            }
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            if (!(source instanceof ByteBuffer))
                source = ByteBuffer.wrap(source, encoding);
            var len = source.limit - source.offset;
            if (len <= 0) return this; // Nothing to prepend
            var diff = len - offset;
            var arrayView;
            if (diff > 0) { // Not enough space before offset, so resize + move
                var buffer = new ArrayBuffer(this.buffer.byteLength + diff);
                arrayView = new Uint8Array(buffer);
                arrayView.set(new Uint8Array(this.buffer).subarray(offset, this.buffer.byteLength), len);
                this.buffer = buffer;
                this.view = new DataView(buffer);
                this.offset += diff;
                if (this.markedOffset >= 0) this.markedOffset += diff;
                this.limit += diff;
                offset += diff;
            } else {
                arrayView = new Uint8Array(this.buffer);
            }
            arrayView.set(new Uint8Array(source.buffer).subarray(source.offset, source.limit), offset - len);
            source.offset = source.limit;
            if (relative)
                this.offset -= len;
            return this;
        };

        /**
         * Prepends this ByteBuffer to another ByteBuffer. This will overwrite any contents before the specified offset up to the
         *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
         *  will be resized and its contents moved accordingly.
         * @param {!ByteBuffer} target Target ByteBuffer
         * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
         *  prepended if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @see ByteBuffer#prepend
         */
        ByteBufferPrototype.prependTo = function(target, offset) {
            target.prepend(this, offset);
            return this;
        };
        /**
         * Prints debug information about this ByteBuffer's contents.
         * @param {function(string)=} out Output function to call, defaults to console.log
         * @expose
         */
        ByteBufferPrototype.printDebug = function(out) {
            if (typeof out !== 'function') out = console.log.bind(console);
            out(
                this.toString()+"\n"+
                "-------------------------------------------------------------------\n"+
                this.toDebug(/* columns */ true)
            );
        };

        /**
         * Gets the number of remaining readable bytes. Contents are the bytes between {@link ByteBuffer#offset} and
         *  {@link ByteBuffer#limit}, so this returns `limit - offset`.
         * @returns {number} Remaining readable bytes. May be negative if `offset > limit`.
         * @expose
         */
        ByteBufferPrototype.remaining = function() {
            return this.limit - this.offset;
        };
        /**
         * Resets this ByteBuffer's {@link ByteBuffer#offset}. If an offset has been marked through {@link ByteBuffer#mark}
         *  before, `offset` will be set to {@link ByteBuffer#markedOffset}, which will then be discarded. If no offset has been
         *  marked, sets `offset = 0`.
         * @returns {!ByteBuffer} this
         * @see ByteBuffer#mark
         * @expose
         */
        ByteBufferPrototype.reset = function() {
            if (this.markedOffset >= 0) {
                this.offset = this.markedOffset;
                this.markedOffset = -1;
            } else {
                this.offset = 0;
            }
            return this;
        };
        /**
         * Resizes this ByteBuffer to be backed by a buffer of at least the given capacity. Will do nothing if already that
         *  large or larger.
         * @param {number} capacity Capacity required
         * @returns {!ByteBuffer} this
         * @throws {TypeError} If `capacity` is not a number
         * @throws {RangeError} If `capacity < 0`
         * @expose
         */
        ByteBufferPrototype.resize = function(capacity) {
            if (!this.noAssert) {
                if (typeof capacity !== 'number' || capacity % 1 !== 0)
                    throw TypeError("Illegal capacity: "+capacity+" (not an integer)");
                capacity |= 0;
                if (capacity < 0)
                    throw RangeError("Illegal capacity: 0 <= "+capacity);
            }
            if (this.buffer.byteLength < capacity) {
                var buffer = new ArrayBuffer(capacity);
                new Uint8Array(buffer).set(new Uint8Array(this.buffer));
                this.buffer = buffer;
                this.view = new DataView(buffer);
            }
            return this;
        };
        /**
         * Reverses this ByteBuffer's contents.
         * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.reverse = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin === end)
                return this; // Nothing to reverse
            Array.prototype.reverse.call(new Uint8Array(this.buffer).subarray(begin, end));
            this.view = new DataView(this.buffer); // FIXME: Why exactly is this necessary?
            return this;
        };
        /**
         * Skips the next `length` bytes. This will just advance
         * @param {number} length Number of bytes to skip. May also be negative to move the offset back.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.skip = function(length) {
            if (!this.noAssert) {
                if (typeof length !== 'number' || length % 1 !== 0)
                    throw TypeError("Illegal length: "+length+" (not an integer)");
                length |= 0;
            }
            var offset = this.offset + length;
            if (!this.noAssert) {
                if (offset < 0 || offset > this.buffer.byteLength)
                    throw RangeError("Illegal length: 0 <= "+this.offset+" + "+length+" <= "+this.buffer.byteLength);
            }
            this.offset = offset;
            return this;
        };

        /**
         * Slices this ByteBuffer by creating a cloned instance with `offset = begin` and `limit = end`.
         * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
         * @returns {!ByteBuffer} Clone of this ByteBuffer with slicing applied, backed by the same {@link ByteBuffer#buffer}
         * @expose
         */
        ByteBufferPrototype.slice = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            var bb = this.clone();
            bb.offset = begin;
            bb.limit = end;
            return bb;
        };
        /**
         * Returns a copy of the backing buffer that contains this ByteBuffer's contents. Contents are the bytes between
         *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will transparently {@link ByteBuffer#flip} this
         *  ByteBuffer if `offset > limit` but the actual offsets remain untouched.
         * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory if
         *  possible. Defaults to `false`
         * @returns {!ArrayBuffer} Contents as an ArrayBuffer
         * @expose
         */
        ByteBufferPrototype.toBuffer = function(forceCopy) {
            var offset = this.offset,
                limit = this.limit;
            if (offset > limit) {
                var t = offset;
                offset = limit;
                limit = t;
            }
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: Not an integer");
                offset >>>= 0;
                if (typeof limit !== 'number' || limit % 1 !== 0)
                    throw TypeError("Illegal limit: Not an integer");
                limit >>>= 0;
                if (offset < 0 || offset > limit || limit > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+offset+" <= "+limit+" <= "+this.buffer.byteLength);
            }
            // NOTE: It's not possible to have another ArrayBuffer reference the same memory as the backing buffer. This is
            // possible with Uint8Array#subarray only, but we have to return an ArrayBuffer by contract. So:
            if (!forceCopy && offset === 0 && limit === this.buffer.byteLength) {
                return this.buffer;
            }
            if (offset === limit) {
                return EMPTY_BUFFER;
            }
            var buffer = new ArrayBuffer(limit - offset);
            new Uint8Array(buffer).set(new Uint8Array(this.buffer).subarray(offset, limit), 0);
            return buffer;
        };

        /**
         * Returns a raw buffer compacted to contain this ByteBuffer's contents. Contents are the bytes between
         *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will transparently {@link ByteBuffer#flip} this
         *  ByteBuffer if `offset > limit` but the actual offsets remain untouched. This is an alias of
         *  {@link ByteBuffer#toBuffer}.
         * @function
         * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory.
         *  Defaults to `false`
         * @returns {!ArrayBuffer} Contents as an ArrayBuffer
         * @expose
         */
        ByteBufferPrototype.toArrayBuffer = ByteBufferPrototype.toBuffer;


        /**
         * Converts the ByteBuffer's contents to a string.
         * @param {string=} encoding Output encoding. Returns an informative string representation if omitted but also allows
         *  direct conversion to "utf8", "hex", "base64" and "binary" encoding. "debug" returns a hex representation with
         *  highlighted offsets.
         * @param {number=} begin Offset to begin at, defaults to {@link ByteBuffer#offset}
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
         * @returns {string} String representation
         * @throws {Error} If `encoding` is invalid
         * @expose
         */
        ByteBufferPrototype.toString = function(encoding, begin, end) {
            if (typeof encoding === 'undefined')
                return "ByteBufferAB(offset="+this.offset+",markedOffset="+this.markedOffset+",limit="+this.limit+",capacity="+this.capacity()+")";
            if (typeof encoding === 'number')
                encoding = "utf8",
                begin = encoding,
                end = begin;
            switch (encoding) {
                case "utf8":
                    return this.toUTF8(begin, end);
                case "base64":
                    return this.toBase64(begin, end);
                case "hex":
                    return this.toHex(begin, end);
                case "binary":
                    return this.toBinary(begin, end);
                case "debug":
                    return this.toDebug();
                case "columns":
                    return this.toColumns();
                default:
                    throw Error("Unsupported encoding: "+encoding);
            }
        };

        // lxiv-embeddable

        /**
         * lxiv-embeddable (c) 2014 Daniel Wirtz <dcode@dcode.io>
         * Released under the Apache License, Version 2.0
         * see: https://github.com/dcodeIO/lxiv for details
         */
        var lxiv = function() {
            "use strict";

            /**
             * lxiv namespace.
             * @type {!Object.<string,*>}
             * @exports lxiv
             */
            var lxiv = {};

            /**
             * Character codes for output.
             * @type {!Array.<number>}
             * @inner
             */
            var aout = [
                65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
                81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 97, 98, 99, 100, 101, 102,
                103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
                119, 120, 121, 122, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47
            ];

            /**
             * Character codes for input.
             * @type {!Array.<number>}
             * @inner
             */
            var ain = [];
            for (var i=0, k=aout.length; i<k; ++i)
                ain[aout[i]] = i;

            /**
             * Encodes bytes to base64 char codes.
             * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if
             *  there are no more bytes left.
             * @param {!function(number)} dst Characters destination as a function successively called with each encoded char
             *  code.
             */
            lxiv.encode = function(src, dst) {
                var b, t;
                while ((b = src()) !== null) {
                    dst(aout[(b>>2)&0x3f]);
                    t = (b&0x3)<<4;
                    if ((b = src()) !== null) {
                        t |= (b>>4)&0xf;
                        dst(aout[(t|((b>>4)&0xf))&0x3f]);
                        t = (b&0xf)<<2;
                        if ((b = src()) !== null)
                            dst(aout[(t|((b>>6)&0x3))&0x3f]),
                            dst(aout[b&0x3f]);
                        else
                            dst(aout[t&0x3f]),
                            dst(61);
                    } else
                        dst(aout[t&0x3f]),
                        dst(61),
                        dst(61);
                }
            };

            /**
             * Decodes base64 char codes to bytes.
             * @param {!function():number|null} src Characters source as a function returning the next char code respectively
             *  `null` if there are no more characters left.
             * @param {!function(number)} dst Bytes destination as a function successively called with the next byte.
             * @throws {Error} If a character code is invalid
             */
            lxiv.decode = function(src, dst) {
                var c, t1, t2;
                function fail(c) {
                    throw Error("Illegal character code: "+c);
                }
                while ((c = src()) !== null) {
                    t1 = ain[c];
                    if (typeof t1 === 'undefined') fail(c);
                    if ((c = src()) !== null) {
                        t2 = ain[c];
                        if (typeof t2 === 'undefined') fail(c);
                        dst((t1<<2)>>>0|(t2&0x30)>>4);
                        if ((c = src()) !== null) {
                            t1 = ain[c];
                            if (typeof t1 === 'undefined')
                                if (c === 61) break; else fail(c);
                            dst(((t2&0xf)<<4)>>>0|(t1&0x3c)>>2);
                            if ((c = src()) !== null) {
                                t2 = ain[c];
                                if (typeof t2 === 'undefined')
                                    if (c === 61) break; else fail(c);
                                dst(((t1&0x3)<<6)>>>0|t2);
                            }
                        }
                    }
                }
            };

            /**
             * Tests if a string is valid base64.
             * @param {string} str String to test
             * @returns {boolean} `true` if valid, otherwise `false`
             */
            lxiv.test = function(str) {
                return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(str);
            };

            return lxiv;
        }();

        // encodings/base64

        /**
         * Encodes this ByteBuffer's contents to a base64 encoded string.
         * @param {number=} begin Offset to begin at, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}.
         * @returns {string} Base64 encoded string
         * @expose
         */
        ByteBufferPrototype.toBase64 = function(begin, end) {
            if (typeof begin === 'undefined')
                begin = this.offset;
            if (typeof end === 'undefined')
                end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            var sd; lxiv.encode(function() {
                return begin < end ? this.view.getUint8(begin++) : null;
            }.bind(this), sd = stringDestination());
            return sd();
        };

        /**
         * Decodes a base64 encoded string to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromBase64 = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                if (str.length % 4 !== 0)
                    throw TypeError("Illegal str: Length not a multiple of 4");
            }
            var bb = new ByteBuffer(str.length/4*3, littleEndian, noAssert),
                i = 0;
            lxiv.decode(stringSource(str), function(b) {
                bb.view.setUint8(i++, b);
            });
            bb.limit = i;
            return bb;
        };

        /**
         * Encodes a binary string to base64 like `window.btoa` does.
         * @param {string} str Binary string
         * @returns {string} Base64 encoded string
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.btoa
         * @expose
         */
        ByteBuffer.btoa = function(str) {
            return ByteBuffer.fromBinary(str).toBase64();
        };

        /**
         * Decodes a base64 encoded string to binary like `window.atob` does.
         * @param {string} b64 Base64 encoded string
         * @returns {string} Binary string
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.atob
         * @expose
         */
        ByteBuffer.atob = function(b64) {
            return ByteBuffer.fromBase64(b64).toBinary();
        };

        // encodings/binary

        /**
         * Encodes this ByteBuffer to a binary encoded string, that is using only characters 0x00-0xFF as bytes.
         * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
         * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
         * @returns {string} Binary encoded string
         * @throws {RangeError} If `offset > limit`
         * @expose
         */
        ByteBufferPrototype.toBinary = function(begin, end) {
            begin = typeof begin === 'undefined' ? this.offset : begin;
            end = typeof end === 'undefined' ? this.limit : end;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin === end)
                return "";
            var cc = [], pt = [];
            while (begin < end) {
                cc.push(this.view.getUint8(begin++));
                if (cc.length >= 1024)
                    pt.push(String.fromCharCode.apply(String, cc)),
                    cc = [];
            }
            return pt.join('') + String.fromCharCode.apply(String, cc);
        };

        /**
         * Decodes a binary encoded string, that is using only characters 0x00-0xFF as bytes, to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromBinary = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
            }
            var i = 0, k = str.length, charCode,
                bb = new ByteBuffer(k, littleEndian, noAssert);
            while (i<k) {
                charCode = str.charCodeAt(i);
                if (!noAssert && charCode > 255)
                    throw RangeError("Illegal charCode at "+i+": 0 <= "+charCode+" <= 255");
                bb.view.setUint8(i++, charCode);
            }
            bb.limit = k;
            return bb;
        };

        // encodings/debug

        /**
         * Encodes this ByteBuffer to a hex encoded string with marked offsets. Offset symbols are:
         * * `<` : offset,
         * * `'` : markedOffset,
         * * `>` : limit,
         * * `|` : offset and limit,
         * * `[` : offset and markedOffset,
         * * `]` : markedOffset and limit,
         * * `!` : offset, markedOffset and limit
         * @param {boolean=} columns If `true` returns two columns hex + ascii, defaults to `false`
         * @returns {string|!Array.<string>} Debug string or array of lines if `asArray = true`
         * @expose
         * @example `>00'01 02<03` contains four bytes with `limit=0, markedOffset=1, offset=3`
         * @example `00[01 02 03>` contains four bytes with `offset=markedOffset=1, limit=4`
         * @example `00|01 02 03` contains four bytes with `offset=limit=1, markedOffset=-1`
         * @example `|` contains zero bytes with `offset=limit=0, markedOffset=-1`
         */
        ByteBufferPrototype.toDebug = function(columns) {
            var i = -1,
                k = this.buffer.byteLength,
                b,
                hex = "",
                asc = "",
                out = "";
            while (i<k) {
                if (i !== -1) {
                    b = this.view.getUint8(i);
                    if (b < 0x10) hex += "0"+b.toString(16).toUpperCase();
                    else hex += b.toString(16).toUpperCase();
                    if (columns) {
                        asc += b > 32 && b < 127 ? String.fromCharCode(b) : '.';
                    }
                }
                ++i;
                if (columns) {
                    if (i > 0 && i % 16 === 0 && i !== k) {
                        while (hex.length < 3*16+3) hex += " ";
                        out += hex+asc+"\n";
                        hex = asc = "";
                    }
                }
                if (i === this.offset && i === this.limit)
                    hex += i === this.markedOffset ? "!" : "|";
                else if (i === this.offset)
                    hex += i === this.markedOffset ? "[" : "<";
                else if (i === this.limit)
                    hex += i === this.markedOffset ? "]" : ">";
                else
                    hex += i === this.markedOffset ? "'" : (columns || (i !== 0 && i !== k) ? " " : "");
            }
            if (columns && hex !== " ") {
                while (hex.length < 3*16+3) hex += " ";
                out += hex+asc+"\n";
            }
            return columns ? out : hex;
        };

        /**
         * Decodes a hex encoded string with marked offsets to a ByteBuffer.
         * @param {string} str Debug string to decode (not be generated with `columns = true`)
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         * @see ByteBuffer#toDebug
         */
        ByteBuffer.fromDebug = function(str, littleEndian, noAssert) {
            var k = str.length,
                bb = new ByteBuffer(((k+1)/3)|0, littleEndian, noAssert);
            var i = 0, j = 0, ch, b,
                rs = false, // Require symbol next
                ho = false, hm = false, hl = false, // Already has offset, markedOffset, limit?
                fail = false;
            while (i<k) {
                switch (ch = str.charAt(i++)) {
                    case '!':
                        if (!noAssert) {
                            if (ho || hm || hl) {
                                fail = true; break;
                            }
                            ho = hm = hl = true;
                        }
                        bb.offset = bb.markedOffset = bb.limit = j;
                        rs = false;
                        break;
                    case '|':
                        if (!noAssert) {
                            if (ho || hl) {
                                fail = true; break;
                            }
                            ho = hl = true;
                        }
                        bb.offset = bb.limit = j;
                        rs = false;
                        break;
                    case '[':
                        if (!noAssert) {
                            if (ho || hm) {
                                fail = true; break;
                            }
                            ho = hm = true;
                        }
                        bb.offset = bb.markedOffset = j;
                        rs = false;
                        break;
                    case '<':
                        if (!noAssert) {
                            if (ho) {
                                fail = true; break;
                            }
                            ho = true;
                        }
                        bb.offset = j;
                        rs = false;
                        break;
                    case ']':
                        if (!noAssert) {
                            if (hl || hm) {
                                fail = true; break;
                            }
                            hl = hm = true;
                        }
                        bb.limit = bb.markedOffset = j;
                        rs = false;
                        break;
                    case '>':
                        if (!noAssert) {
                            if (hl) {
                                fail = true; break;
                            }
                            hl = true;
                        }
                        bb.limit = j;
                        rs = false;
                        break;
                    case "'":
                        if (!noAssert) {
                            if (hm) {
                                fail = true; break;
                            }
                            hm = true;
                        }
                        bb.markedOffset = j;
                        rs = false;
                        break;
                    case ' ':
                        rs = false;
                        break;
                    default:
                        if (!noAssert) {
                            if (rs) {
                                fail = true; break;
                            }
                        }
                        b = parseInt(ch+str.charAt(i++), 16);
                        if (!noAssert) {
                            if (isNaN(b) || b < 0 || b > 255)
                                throw TypeError("Illegal str: Not a debug encoded string");
                        }
                        bb.view.setUint8(j++, b);
                        rs = true;
                }
                if (fail)
                    throw TypeError("Illegal str: Invalid symbol at "+i);
            }
            if (!noAssert) {
                if (!ho || !hl)
                    throw TypeError("Illegal str: Missing offset or limit");
                if (j<bb.buffer.byteLength)
                    throw TypeError("Illegal str: Not a debug encoded string (is it hex?) "+j+" < "+k);
            }
            return bb;
        };

        // encodings/hex

        /**
         * Encodes this ByteBuffer's contents to a hex encoded string.
         * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
         * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
         * @returns {string} Hex encoded string
         * @expose
         */
        ByteBufferPrototype.toHex = function(begin, end) {
            begin = typeof begin === 'undefined' ? this.offset : begin;
            end = typeof end === 'undefined' ? this.limit : end;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            var out = new Array(end - begin),
                b;
            while (begin < end) {
                b = this.view.getUint8(begin++);
                if (b < 0x10)
                    out.push("0", b.toString(16));
                else out.push(b.toString(16));
            }
            return out.join('');
        };

        /**
         * Decodes a hex encoded string to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromHex = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                if (str.length % 2 !== 0)
                    throw TypeError("Illegal str: Length not a multiple of 2");
            }
            var k = str.length,
                bb = new ByteBuffer((k / 2) | 0, littleEndian),
                b;
            for (var i=0, j=0; i<k; i+=2) {
                b = parseInt(str.substring(i, i+2), 16);
                if (!noAssert)
                    if (!isFinite(b) || b < 0 || b > 255)
                        throw TypeError("Illegal str: Contains non-hex characters");
                bb.view.setUint8(j++, b);
            }
            bb.limit = j;
            return bb;
        };

        // utfx-embeddable

        /**
         * utfx-embeddable (c) 2014 Daniel Wirtz <dcode@dcode.io>
         * Released under the Apache License, Version 2.0
         * see: https://github.com/dcodeIO/utfx for details
         */
        var utfx = function() {
            "use strict";

            /**
             * utfx namespace.
             * @inner
             * @type {!Object.<string,*>}
             */
            var utfx = {};

            /**
             * Maximum valid code point.
             * @type {number}
             * @const
             */
            utfx.MAX_CODEPOINT = 0x10FFFF;

            /**
             * Encodes UTF8 code points to UTF8 bytes.
             * @param {(!function():number|null) | number} src Code points source, either as a function returning the next code point
             *  respectively `null` if there are no more code points left or a single numeric code point.
             * @param {!function(number)} dst Bytes destination as a function successively called with the next byte
             */
            utfx.encodeUTF8 = function(src, dst) {
                var cp = null;
                if (typeof src === 'number')
                    cp = src,
                    src = function() { return null; };
                while (cp !== null || (cp = src()) !== null) {
                    if (cp < 0x80)
                        dst(cp&0x7F);
                    else if (cp < 0x800)
                        dst(((cp>>6)&0x1F)|0xC0),
                        dst((cp&0x3F)|0x80);
                    else if (cp < 0x10000)
                        dst(((cp>>12)&0x0F)|0xE0),
                        dst(((cp>>6)&0x3F)|0x80),
                        dst((cp&0x3F)|0x80);
                    else
                        dst(((cp>>18)&0x07)|0xF0),
                        dst(((cp>>12)&0x3F)|0x80),
                        dst(((cp>>6)&0x3F)|0x80),
                        dst((cp&0x3F)|0x80);
                    cp = null;
                }
            };

            /**
             * Decodes UTF8 bytes to UTF8 code points.
             * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if there
             *  are no more bytes left.
             * @param {!function(number)} dst Code points destination as a function successively called with each decoded code point.
             * @throws {RangeError} If a starting byte is invalid in UTF8
             * @throws {Error} If the last sequence is truncated. Has an array property `bytes` holding the
             *  remaining bytes.
             */
            utfx.decodeUTF8 = function(src, dst) {
                var a, b, c, d, fail = function(b) {
                    b = b.slice(0, b.indexOf(null));
                    var err = Error(b.toString());
                    err.name = "TruncatedError";
                    err['bytes'] = b;
                    throw err;
                };
                while ((a = src()) !== null) {
                    if ((a&0x80) === 0)
                        dst(a);
                    else if ((a&0xE0) === 0xC0)
                        ((b = src()) === null) && fail([a, b]),
                        dst(((a&0x1F)<<6) | (b&0x3F));
                    else if ((a&0xF0) === 0xE0)
                        ((b=src()) === null || (c=src()) === null) && fail([a, b, c]),
                        dst(((a&0x0F)<<12) | ((b&0x3F)<<6) | (c&0x3F));
                    else if ((a&0xF8) === 0xF0)
                        ((b=src()) === null || (c=src()) === null || (d=src()) === null) && fail([a, b, c ,d]),
                        dst(((a&0x07)<<18) | ((b&0x3F)<<12) | ((c&0x3F)<<6) | (d&0x3F));
                    else throw RangeError("Illegal starting byte: "+a);
                }
            };

            /**
             * Converts UTF16 characters to UTF8 code points.
             * @param {!function():number|null} src Characters source as a function returning the next char code respectively
             *  `null` if there are no more characters left.
             * @param {!function(number)} dst Code points destination as a function successively called with each converted code
             *  point.
             */
            utfx.UTF16toUTF8 = function(src, dst) {
                var c1, c2 = null;
                while (true) {
                    if ((c1 = c2 !== null ? c2 : src()) === null)
                        break;
                    if (c1 >= 0xD800 && c1 <= 0xDFFF) {
                        if ((c2 = src()) !== null) {
                            if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
                                dst((c1-0xD800)*0x400+c2-0xDC00+0x10000);
                                c2 = null; continue;
                            }
                        }
                    }
                    dst(c1);
                }
                if (c2 !== null) dst(c2);
            };

            /**
             * Converts UTF8 code points to UTF16 characters.
             * @param {(!function():number|null) | number} src Code points source, either as a function returning the next code point
             *  respectively `null` if there are no more code points left or a single numeric code point.
             * @param {!function(number)} dst Characters destination as a function successively called with each converted char code.
             * @throws {RangeError} If a code point is out of range
             */
            utfx.UTF8toUTF16 = function(src, dst) {
                var cp = null;
                if (typeof src === 'number')
                    cp = src, src = function() { return null; };
                while (cp !== null || (cp = src()) !== null) {
                    if (cp <= 0xFFFF)
                        dst(cp);
                    else
                        cp -= 0x10000,
                        dst((cp>>10)+0xD800),
                        dst((cp%0x400)+0xDC00);
                    cp = null;
                }
            };

            /**
             * Converts and encodes UTF16 characters to UTF8 bytes.
             * @param {!function():number|null} src Characters source as a function returning the next char code respectively `null`
             *  if there are no more characters left.
             * @param {!function(number)} dst Bytes destination as a function successively called with the next byte.
             */
            utfx.encodeUTF16toUTF8 = function(src, dst) {
                utfx.UTF16toUTF8(src, function(cp) {
                    utfx.encodeUTF8(cp, dst);
                });
            };

            /**
             * Decodes and converts UTF8 bytes to UTF16 characters.
             * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if there
             *  are no more bytes left.
             * @param {!function(number)} dst Characters destination as a function successively called with each converted char code.
             * @throws {RangeError} If a starting byte is invalid in UTF8
             * @throws {Error} If the last sequence is truncated. Has an array property `bytes` holding the remaining bytes.
             */
            utfx.decodeUTF8toUTF16 = function(src, dst) {
                utfx.decodeUTF8(src, function(cp) {
                    utfx.UTF8toUTF16(cp, dst);
                });
            };

            /**
             * Calculates the byte length of an UTF8 code point.
             * @param {number} cp UTF8 code point
             * @returns {number} Byte length
             */
            utfx.calculateCodePoint = function(cp) {
                return (cp < 0x80) ? 1 : (cp < 0x800) ? 2 : (cp < 0x10000) ? 3 : 4;
            };

            /**
             * Calculates the number of UTF8 bytes required to store UTF8 code points.
             * @param {(!function():number|null)} src Code points source as a function returning the next code point respectively
             *  `null` if there are no more code points left.
             * @returns {number} The number of UTF8 bytes required
             */
            utfx.calculateUTF8 = function(src) {
                var cp, l=0;
                while ((cp = src()) !== null)
                    l += utfx.calculateCodePoint(cp);
                return l;
            };

            /**
             * Calculates the number of UTF8 code points respectively UTF8 bytes required to store UTF16 char codes.
             * @param {(!function():number|null)} src Characters source as a function returning the next char code respectively
             *  `null` if there are no more characters left.
             * @returns {!Array.<number>} The number of UTF8 code points at index 0 and the number of UTF8 bytes required at index 1.
             */
            utfx.calculateUTF16asUTF8 = function(src) {
                var n=0, l=0;
                utfx.UTF16toUTF8(src, function(cp) {
                    ++n; l += utfx.calculateCodePoint(cp);
                });
                return [n,l];
            };

            return utfx;
        }();

        // encodings/utf8

        /**
         * Encodes this ByteBuffer's contents between {@link ByteBuffer#offset} and {@link ByteBuffer#limit} to an UTF8 encoded
         *  string.
         * @returns {string} Hex encoded string
         * @throws {RangeError} If `offset > limit`
         * @expose
         */
        ByteBufferPrototype.toUTF8 = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            var sd; try {
                utfx.decodeUTF8toUTF16(function() {
                    return begin < end ? this.view.getUint8(begin++) : null;
                }.bind(this), sd = stringDestination());
            } catch (e) {
                if (begin !== end)
                    throw RangeError("Illegal range: Truncated data, "+begin+" != "+end);
            }
            return sd();
        };

        /**
         * Decodes an UTF8 encoded string to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromUTF8 = function(str, littleEndian, noAssert) {
            if (!noAssert)
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
            var bb = new ByteBuffer(utfx.calculateUTF16asUTF8(stringSource(str), true)[1], littleEndian, noAssert),
                i = 0;
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                bb.view.setUint8(i++, b);
            });
            bb.limit = i;
            return bb;
        };


        return ByteBuffer;
    }

    /* CommonJS */ if (typeof require === 'function' && typeof module === 'object' && module && typeof exports === 'object' && exports)
        module['exports'] = (function() {
            var Long; try { Long = require("long"); } catch (e) {}
            return loadByteBuffer(Long);
        })();
    /* AMD */ else if (typeof define === 'function' && define["amd"])
        define("ByteBuffer", ["Long"], function(Long) { return loadByteBuffer(Long); });
    /* Global */ else
        (global["dcodeIO"] = global["dcodeIO"] || {})["ByteBuffer"] = loadByteBuffer(global["dcodeIO"]["Long"]);

})(this);
/*
 ByteBuffer.js (c) 2013-2014 Daniel Wirtz <dcode@dcode.io>
 This version of ByteBuffer.js uses an ArrayBuffer (AB) as its backing buffer and is compatible with modern browsers.
 Released under the Apache License, Version 2.0
 see: https://github.com/dcodeIO/ByteBuffer.js for details
*/
(function(s){function u(k){function g(a,b,c){"undefined"===typeof a&&(a=g.DEFAULT_CAPACITY);"undefined"===typeof b&&(b=g.DEFAULT_ENDIAN);"undefined"===typeof c&&(c=g.DEFAULT_NOASSERT);if(!c){a|=0;if(0>a)throw RangeError("Illegal capacity");b=!!b;c=!!c}this.buffer=0===a?s:new ArrayBuffer(a);this.view=0===a?null:new DataView(this.buffer);this.offset=0;this.markedOffset=-1;this.limit=a;this.littleEndian="undefined"!==typeof b?!!b:!1;this.noAssert=!!c}function m(a){var b=0;return function(){return b<
a.length?a.charCodeAt(b++):null}}function t(){var a=[],b=[];return function(){if(0===arguments.length)return b.join("")+u.apply(String,a);1024<a.length+arguments.length&&(b.push(u.apply(String,a)),a.length=0);Array.prototype.push.apply(a,arguments)}}g.VERSION="3.5.4";g.LITTLE_ENDIAN=!0;g.BIG_ENDIAN=!1;g.DEFAULT_CAPACITY=16;g.DEFAULT_ENDIAN=g.BIG_ENDIAN;g.DEFAULT_NOASSERT=!1;g.Long=k||null;var e=g.prototype,s=new ArrayBuffer(0),u=String.fromCharCode;g.allocate=function(a,b,c){return new g(a,b,c)};
g.concat=function(a,b,c,d){if("boolean"===typeof b||"string"!==typeof b)d=c,c=b,b=void 0;for(var f=0,n=0,h=a.length,e;n<h;++n)g.isByteBuffer(a[n])||(a[n]=g.wrap(a[n],b)),e=a[n].limit-a[n].offset,0<e&&(f+=e);if(0===f)return new g(0,c,d);b=new g(f,c,d);d=new Uint8Array(b.buffer);for(n=0;n<h;)c=a[n++],e=c.limit-c.offset,0>=e||(d.set((new Uint8Array(c.buffer)).subarray(c.offset,c.limit),b.offset),b.offset+=e);b.limit=b.offset;b.offset=0;return b};g.isByteBuffer=function(a){return!0===(a&&a instanceof
g)};g.type=function(){return ArrayBuffer};g.wrap=function(a,b,c,d){"string"!==typeof b&&(d=c,c=b,b=void 0);if("string"===typeof a)switch("undefined"===typeof b&&(b="utf8"),b){case "base64":return g.fromBase64(a,c);case "hex":return g.fromHex(a,c);case "binary":return g.fromBinary(a,c);case "utf8":return g.fromUTF8(a,c);case "debug":return g.fromDebug(a,c);default:throw Error("Unsupported encoding: "+b);}if(null===a||"object"!==typeof a)throw TypeError("Illegal buffer");if(g.isByteBuffer(a))return b=
e.clone.call(a),b.markedOffset=-1,b;if(a instanceof Uint8Array)b=new g(0,c,d),0<a.length&&(b.buffer=a.buffer,b.offset=a.byteOffset,b.limit=a.byteOffset+a.length,b.view=0<a.length?new DataView(a.buffer):null);else if(a instanceof ArrayBuffer)b=new g(0,c,d),0<a.byteLength&&(b.buffer=a,b.offset=0,b.limit=a.byteLength,b.view=0<a.byteLength?new DataView(a):null);else if("[object Array]"===Object.prototype.toString.call(a))for(b=new g(a.length,c,d),b.limit=a.length,i=0;i<a.length;++i)b.view.setUint8(i,
a[i]);else throw TypeError("Illegal buffer");return b};e.writeInt8=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal value: "+a+" (not an integer)");a|=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}b+=1;var d=this.buffer.byteLength;b>d&&this.resize((d*=
2)>b?d:b);this.view.setInt8(b-1,a);c&&(this.offset+=1);return this};e.writeByte=e.writeInt8;e.readInt8=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+1>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+1) <= "+this.buffer.byteLength);}a=this.view.getInt8(a);b&&(this.offset+=1);return a};e.readByte=e.readInt8;e.writeUint8=function(a,b){var c=
"undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal value: "+a+" (not an integer)");a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}b+=1;var d=this.buffer.byteLength;b>d&&this.resize((d*=2)>b?d:b);this.view.setUint8(b-1,a);c&&(this.offset+=1);return this};e.readUint8=
function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+1>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+1) <= "+this.buffer.byteLength);}a=this.view.getUint8(a);b&&(this.offset+=1);return a};e.writeInt16=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal value: "+
a+" (not an integer)");a|=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}b+=2;var d=this.buffer.byteLength;b>d&&this.resize((d*=2)>b?d:b);this.view.setInt16(b-2,a,this.littleEndian);c&&(this.offset+=2);return this};e.writeShort=e.writeInt16;e.readInt16=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==
typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+2>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+2) <= "+this.buffer.byteLength);}a=this.view.getInt16(a,this.littleEndian);b&&(this.offset+=2);return a};e.readShort=e.readInt16;e.writeUint16=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal value: "+a+" (not an integer)");a>>>=0;if("number"!==typeof b||
0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}b+=2;var d=this.buffer.byteLength;b>d&&this.resize((d*=2)>b?d:b);this.view.setUint16(b-2,a,this.littleEndian);c&&(this.offset+=2);return this};e.readUint16=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");
a>>>=0;if(0>a||a+2>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+2) <= "+this.buffer.byteLength);}a=this.view.getUint16(a,this.littleEndian);b&&(this.offset+=2);return a};e.writeInt32=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal value: "+a+" (not an integer)");a|=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+
b+" (+0) <= "+this.buffer.byteLength);}b+=4;var d=this.buffer.byteLength;b>d&&this.resize((d*=2)>b?d:b);this.view.setInt32(b-4,a,this.littleEndian);c&&(this.offset+=4);return this};e.writeInt=e.writeInt32;e.readInt32=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+4>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+4) <= "+this.buffer.byteLength);
}a=this.view.getInt32(a,this.littleEndian);b&&(this.offset+=4);return a};e.readInt=e.readInt32;e.writeUint32=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal value: "+a+" (not an integer)");a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}b+=
4;var d=this.buffer.byteLength;b>d&&this.resize((d*=2)>b?d:b);this.view.setUint32(b-4,a,this.littleEndian);c&&(this.offset+=4);return this};e.readUint32=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+4>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+4) <= "+this.buffer.byteLength);}a=this.view.getUint32(a,this.littleEndian);b&&(this.offset+=
4);return a};k&&(e.writeInt64=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"===typeof a)a=k.fromNumber(a);else if(!(a&&a instanceof k))throw TypeError("Illegal value: "+a+" (not an integer or Long)");if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}"number"===typeof a&&(a=k.fromNumber(a));b+=
8;var d=this.buffer.byteLength;b>d&&this.resize((d*=2)>b?d:b);b-=8;this.littleEndian?(this.view.setInt32(b,a.low,!0),this.view.setInt32(b+4,a.high,!0)):(this.view.setInt32(b,a.high,!1),this.view.setInt32(b+4,a.low,!1));c&&(this.offset+=8);return this},e.writeLong=e.writeInt64,e.readInt64=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+8>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+
a+" (+8) <= "+this.buffer.byteLength);}a=this.littleEndian?new k(this.view.getInt32(a,!0),this.view.getInt32(a+4,!0),!1):new k(this.view.getInt32(a+4,!1),this.view.getInt32(a,!1),!1);b&&(this.offset+=8);return a},e.readLong=e.readInt64,e.writeUint64=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"===typeof a)a=k.fromNumber(a);else if(!(a&&a instanceof k))throw TypeError("Illegal value: "+a+" (not an integer or Long)");if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+
b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}"number"===typeof a&&(a=k.fromNumber(a));b+=8;var d=this.buffer.byteLength;b>d&&this.resize((d*=2)>b?d:b);b-=8;this.littleEndian?(this.view.setInt32(b,a.low,!0),this.view.setInt32(b+4,a.high,!0)):(this.view.setInt32(b,a.high,!1),this.view.setInt32(b+4,a.low,!1));c&&(this.offset+=8);return this},e.readUint64=function(a){var b="undefined"===typeof a;b&&(a=
this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+8>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+8) <= "+this.buffer.byteLength);}a=this.littleEndian?new k(this.view.getInt32(a,!0),this.view.getInt32(a+4,!0),!0):new k(this.view.getInt32(a+4,!1),this.view.getInt32(a,!1),!0);b&&(this.offset+=8);return a});e.writeFloat32=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==
typeof a)throw TypeError("Illegal value: "+a+" (not a number)");if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}b+=4;var d=this.buffer.byteLength;b>d&&this.resize((d*=2)>b?d:b);this.view.setFloat32(b-4,a,this.littleEndian);c&&(this.offset+=4);return this};e.writeFloat=e.writeFloat32;e.readFloat32=function(a){var b="undefined"===typeof a;
b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+4>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+4) <= "+this.buffer.byteLength);}a=this.view.getFloat32(a,this.littleEndian);b&&(this.offset+=4);return a};e.readFloat=e.readFloat32;e.writeFloat64=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==typeof a)throw TypeError("Illegal value: "+
a+" (not a number)");if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}b+=8;var d=this.buffer.byteLength;b>d&&this.resize((d*=2)>b?d:b);this.view.setFloat64(b-8,a,this.littleEndian);c&&(this.offset+=8);return this};e.writeDouble=e.writeFloat64;e.readFloat64=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==
typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+8>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+8) <= "+this.buffer.byteLength);}a=this.view.getFloat64(a,this.littleEndian);b&&(this.offset+=8);return a};e.readDouble=e.readFloat64;g.MAX_VARINT32_BYTES=5;g.calculateVarint32=function(a){a>>>=0;return 128>a?1:16384>a?2:2097152>a?3:268435456>a?4:5};g.zigZagEncode32=function(a){return((a|=0)<<1^a>>31)>>>0};g.zigZagDecode32=function(a){return a>>>
1^-(a&1)|0};e.writeVarint32=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal value: "+a+" (not an integer)");a|=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}var d=g.calculateVarint32(a);b+=d;var f=this.buffer.byteLength;b>f&&this.resize((f*=2)>
b?f:b);b-=d;this.view.setUint8(b,d=a|128);a>>>=0;128<=a?(d=a>>7|128,this.view.setUint8(b+1,d),16384<=a?(d=a>>14|128,this.view.setUint8(b+2,d),2097152<=a?(d=a>>21|128,this.view.setUint8(b+3,d),268435456<=a?(this.view.setUint8(b+4,a>>28&15),d=5):(this.view.setUint8(b+3,d&127),d=4)):(this.view.setUint8(b+2,d&127),d=3)):(this.view.setUint8(b+1,d&127),d=2)):(this.view.setUint8(b,d&127),d=1);return c?(this.offset+=d,this):d};e.writeVarint32ZigZag=function(a,b){return this.writeVarint32(g.zigZagEncode32(a),
b)};e.readVarint32=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+1>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+1) <= "+this.buffer.byteLength);}var c=0,d=0,f;do{f=a+c;if(!this.noAssert&&f>this.limit)throw a=Error("Truncated"),a.truncated=!0,a;f=this.view.getUint8(f);5>c&&(d|=(f&127)<<7*c>>>0);++c}while(128===(f&128));d|=0;return b?(this.offset+=
c,d):{value:d,length:c}};e.readVarint32ZigZag=function(a){a=this.readVarint32(a);"object"===typeof a?a.value=g.zigZagDecode32(a.value):a=g.zigZagDecode32(a);return a};k&&(g.MAX_VARINT64_BYTES=10,g.calculateVarint64=function(a){"number"===typeof a&&(a=k.fromNumber(a));var b=a.toInt()>>>0,c=a.shiftRightUnsigned(28).toInt()>>>0;a=a.shiftRightUnsigned(56).toInt()>>>0;return 0==a?0==c?16384>b?128>b?1:2:2097152>b?3:4:16384>c?128>c?5:6:2097152>c?7:8:128>a?9:10},g.zigZagEncode64=function(a){"number"===typeof a?
a=k.fromNumber(a,!1):!1!==a.unsigned&&(a=a.toSigned());return a.shiftLeft(1).xor(a.shiftRight(63)).toUnsigned()},g.zigZagDecode64=function(a){"number"===typeof a?a=k.fromNumber(a,!1):!1!==a.unsigned&&(a=a.toSigned());return a.shiftRightUnsigned(1).xor(a.and(k.ONE).toSigned().negate()).toSigned()},e.writeVarint64=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"===typeof a)a=k.fromNumber(a);else if(!(a&&a instanceof k))throw TypeError("Illegal value: "+a+
" (not an integer or Long)");if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}"number"===typeof a?a=k.fromNumber(a,!1):!1!==a.unsigned&&(a=a.toSigned());var d=g.calculateVarint64(a),f=a.toInt()>>>0,n=a.shiftRightUnsigned(28).toInt()>>>0,e=a.shiftRightUnsigned(56).toInt()>>>0;b+=d;var r=this.buffer.byteLength;b>r&&this.resize((r*=2)>b?r:
b);b-=d;switch(d){case 10:this.view.setUint8(b+9,e>>>7&1);case 9:this.view.setUint8(b+8,9!==d?e|128:e&127);case 8:this.view.setUint8(b+7,8!==d?n>>>21|128:n>>>21&127);case 7:this.view.setUint8(b+6,7!==d?n>>>14|128:n>>>14&127);case 6:this.view.setUint8(b+5,6!==d?n>>>7|128:n>>>7&127);case 5:this.view.setUint8(b+4,5!==d?n|128:n&127);case 4:this.view.setUint8(b+3,4!==d?f>>>21|128:f>>>21&127);case 3:this.view.setUint8(b+2,3!==d?f>>>14|128:f>>>14&127);case 2:this.view.setUint8(b+1,2!==d?f>>>7|128:f>>>7&
127);case 1:this.view.setUint8(b,1!==d?f|128:f&127)}return c?(this.offset+=d,this):d},e.writeVarint64ZigZag=function(a,b){return this.writeVarint64(g.zigZagEncode64(a),b)},e.readVarint64=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+1>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+1) <= "+this.buffer.byteLength);}var c=a,d=0,f=0,e=0,h=0,
h=this.view.getUint8(a++),d=h&127;if(h&128&&(h=this.view.getUint8(a++),d|=(h&127)<<7,h&128&&(h=this.view.getUint8(a++),d|=(h&127)<<14,h&128&&(h=this.view.getUint8(a++),d|=(h&127)<<21,h&128&&(h=this.view.getUint8(a++),f=h&127,h&128&&(h=this.view.getUint8(a++),f|=(h&127)<<7,h&128&&(h=this.view.getUint8(a++),f|=(h&127)<<14,h&128&&(h=this.view.getUint8(a++),f|=(h&127)<<21,h&128&&(h=this.view.getUint8(a++),e=h&127,h&128&&(h=this.view.getUint8(a++),e|=(h&127)<<7,h&128))))))))))throw Error("Buffer overrun");
d=k.fromBits(d|f<<28,f>>>4|e<<24,!1);return b?(this.offset=a,d):{value:d,length:a-c}},e.readVarint64ZigZag=function(a){(a=this.readVarint64(a))&&a.value instanceof k?a.value=g.zigZagDecode64(a.value):a=g.zigZagDecode64(a);return a});e.writeCString=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);var d,f=a.length;if(!this.noAssert){if("string"!==typeof a)throw TypeError("Illegal str: Not a string");for(d=0;d<f;++d)if(0===a.charCodeAt(d))throw RangeError("Illegal str: Contains NULL-characters");
if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}d=b;f=l.a(m(a))[1];b+=f+1;var e=this.buffer.byteLength;b>e&&this.resize((e*=2)>b?e:b);b-=f+1;l.c(m(a),function(a){this.view.setUint8(b++,a)}.bind(this));this.view.setUint8(b++,0);return c?(this.offset=b-d,this):f};e.readCString=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==
typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+1>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+1) <= "+this.buffer.byteLength);}var c=a,d,f=-1;l.b(function(){if(0===f)return null;if(a>=this.limit)throw RangeError("Illegal range: Truncated data, "+a+" < "+this.limit);return 0===(f=this.view.getUint8(a++))?null:f}.bind(this),d=t(),!0);return b?(this.offset=a,d()):{string:d(),length:a-c}};e.writeIString=function(a,b){var c="undefined"===
typeof b;c&&(b=this.offset);if(!this.noAssert){if("string"!==typeof a)throw TypeError("Illegal str: Not a string");if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}var d=b,f;f=l.a(m(a),this.noAssert)[1];b+=4+f;var e=this.buffer.byteLength;b>e&&this.resize((e*=2)>b?e:b);b-=4+f;this.view.setUint32(b,f,this.littleEndian);b+=4;l.c(m(a),function(a){this.view.setUint8(b++,
a)}.bind(this));if(b!==d+4+f)throw RangeError("Illegal range: Truncated data, "+b+" == "+(b+4+f));return c?(this.offset=b,this):b-d};e.readIString=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");a>>>=0;if(0>a||a+4>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+4) <= "+this.buffer.byteLength);}var c=0,d=a,c=this.view.getUint32(a,this.littleEndian);a+=4;var f=
a+c;l.b(function(){return a<f?this.view.getUint8(a++):null}.bind(this),c=t(),this.noAssert);c=c();return b?(this.offset=a,c):{string:c,length:a-d}};g.METRICS_CHARS="c";g.METRICS_BYTES="b";e.writeUTF8String=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}var d,
f=b;d=l.a(m(a))[1];b+=d;var e=this.buffer.byteLength;b>e&&this.resize((e*=2)>b?e:b);b-=d;l.c(m(a),function(a){this.view.setUint8(b++,a)}.bind(this));return c?(this.offset=b,this):b-f};e.writeString=e.writeUTF8String;g.calculateUTF8Chars=function(a){return l.a(m(a))[0]};g.calculateUTF8Bytes=function(a){return l.a(m(a))[1]};e.readUTF8String=function(a,b,c){"number"===typeof b&&(c=b,b=void 0);var d="undefined"===typeof c;d&&(c=this.offset);"undefined"===typeof b&&(b=g.METRICS_CHARS);if(!this.noAssert){if("number"!==
typeof a||0!==a%1)throw TypeError("Illegal length: "+a+" (not an integer)");a|=0;if("number"!==typeof c||0!==c%1)throw TypeError("Illegal offset: "+c+" (not an integer)");c>>>=0;if(0>c||c+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+c+" (+0) <= "+this.buffer.byteLength);}var f=0,e=c,h;if(b===g.METRICS_CHARS){h=t();l.g(function(){return f<a&&c<this.limit?this.view.getUint8(c++):null}.bind(this),function(a){++f;l.e(a,h)}.bind(this));if(f!==a)throw RangeError("Illegal range: Truncated data, "+
f+" == "+a);return d?(this.offset=c,h()):{string:h(),length:c-e}}if(b===g.METRICS_BYTES){if(!this.noAssert){if("number"!==typeof c||0!==c%1)throw TypeError("Illegal offset: "+c+" (not an integer)");c>>>=0;if(0>c||c+a>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+c+" (+"+a+") <= "+this.buffer.byteLength);}var r=c+a;l.b(function(){return c<r?this.view.getUint8(c++):null}.bind(this),h=t(),this.noAssert);if(c!==r)throw RangeError("Illegal range: Truncated data, "+c+" == "+r);return d?
(this.offset=c,h()):{string:h(),length:c-e}}throw TypeError("Unsupported metrics: "+b);};e.readString=e.readUTF8String;e.writeVString=function(a,b){var c="undefined"===typeof b;c&&(b=this.offset);if(!this.noAssert){if("string"!==typeof a)throw TypeError("Illegal str: Not a string");if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: "+b+" (not an integer)");b>>>=0;if(0>b||b+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+b+" (+0) <= "+this.buffer.byteLength);}var d=
b,f,e;f=l.a(m(a),this.noAssert)[1];e=g.calculateVarint32(f);b+=e+f;var h=this.buffer.byteLength;b>h&&this.resize((h*=2)>b?h:b);b-=e+f;b+=this.writeVarint32(f,b);l.c(m(a),function(a){this.view.setUint8(b++,a)}.bind(this));if(b!==d+f+e)throw RangeError("Illegal range: Truncated data, "+b+" == "+(b+f+e));return c?(this.offset=b,this):b-d};e.readVString=function(a){var b="undefined"===typeof a;b&&(a=this.offset);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+a+" (not an integer)");
a>>>=0;if(0>a||a+1>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+1) <= "+this.buffer.byteLength);}var c=this.readVarint32(a),d=a;a+=c.length;var c=c.value,f=a+c,c=t();l.b(function(){return a<f?this.view.getUint8(a++):null}.bind(this),c,this.noAssert);c=c();return b?(this.offset=a,c):{string:c,length:a-d}};e.append=function(a,b,c){if("number"===typeof b||"string"!==typeof b)c=b,b=void 0;var d="undefined"===typeof c;d&&(c=this.offset);if(!this.noAssert){if("number"!==typeof c||
0!==c%1)throw TypeError("Illegal offset: "+c+" (not an integer)");c>>>=0;if(0>c||c+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+c+" (+0) <= "+this.buffer.byteLength);}a instanceof g||(a=g.wrap(a,b));b=a.limit-a.offset;if(0>=b)return this;c+=b;var f=this.buffer.byteLength;c>f&&this.resize((f*=2)>c?f:c);(new Uint8Array(this.buffer,c-b)).set((new Uint8Array(a.buffer)).subarray(a.offset,a.limit));a.offset+=b;d&&(this.offset+=b);return this};e.appendTo=function(a,b){a.append(this,
b);return this};e.assert=function(a){this.noAssert=!a;return this};e.capacity=function(){return this.buffer.byteLength};e.clear=function(){this.offset=0;this.limit=this.buffer.byteLength;this.markedOffset=-1;return this};e.clone=function(a){var b=new g(0,this.littleEndian,this.noAssert);a?(a=new ArrayBuffer(this.buffer.byteLength),(new Uint8Array(a)).set(this.buffer),b.buffer=a,b.view=new DataView(a)):(b.buffer=this.buffer,b.view=this.view);b.offset=this.offset;b.markedOffset=this.markedOffset;b.limit=
this.limit;return b};e.compact=function(a,b){"undefined"===typeof a&&(a=this.offset);"undefined"===typeof b&&(b=this.limit);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal begin: Not an integer");a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal end: Not an integer");b>>>=0;if(0>a||a>b||b>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+a+" <= "+b+" <= "+this.buffer.byteLength);}if(0===a&&b===this.buffer.byteLength)return this;var c=b-a;if(0===
c)return this.buffer=s,this.view=null,0<=this.markedOffset&&(this.markedOffset-=a),this.limit=this.offset=0,this;var d=new ArrayBuffer(c);(new Uint8Array(d)).set((new Uint8Array(this.buffer)).subarray(a,b));this.buffer=d;this.view=new DataView(d);0<=this.markedOffset&&(this.markedOffset-=a);this.offset=0;this.limit=c;return this};e.copy=function(a,b){"undefined"===typeof a&&(a=this.offset);"undefined"===typeof b&&(b=this.limit);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal begin: Not an integer");
a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal end: Not an integer");b>>>=0;if(0>a||a>b||b>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+a+" <= "+b+" <= "+this.buffer.byteLength);}if(a===b)return new g(0,this.littleEndian,this.noAssert);var c=b-a,d=new g(c,this.littleEndian,this.noAssert);d.offset=0;d.limit=c;0<=d.markedOffset&&(d.markedOffset-=a);this.copyTo(d,0,a,b);return d};e.copyTo=function(a,b,c,d){var f,e;if(!this.noAssert&&!g.isByteBuffer(a))throw TypeError("Illegal target: Not a ByteBuffer");
b=(e="undefined"===typeof b)?a.offset:b|0;c=(f="undefined"===typeof c)?this.offset:c|0;d="undefined"===typeof d?this.limit:d|0;if(0>b||b>a.buffer.byteLength)throw RangeError("Illegal target range: 0 <= "+b+" <= "+a.buffer.byteLength);if(0>c||d>this.buffer.byteLength)throw RangeError("Illegal source range: 0 <= "+c+" <= "+this.buffer.byteLength);var h=d-c;if(0===h)return a;a.ensureCapacity(b+h);(new Uint8Array(a.buffer)).set((new Uint8Array(this.buffer)).subarray(c,d),b);f&&(this.offset+=h);e&&(a.offset+=
h);return this};e.ensureCapacity=function(a){var b=this.buffer.byteLength;return b<a?this.resize((b*=2)>a?b:a):this};e.fill=function(a,b,c){var d="undefined"===typeof b;d&&(b=this.offset);"string"===typeof a&&0<a.length&&(a=a.charCodeAt(0));"undefined"===typeof b&&(b=this.offset);"undefined"===typeof c&&(c=this.limit);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal value: "+a+" (not an integer)");a|=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal begin: Not an integer");
b>>>=0;if("number"!==typeof c||0!==c%1)throw TypeError("Illegal end: Not an integer");c>>>=0;if(0>b||b>c||c>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+b+" <= "+c+" <= "+this.buffer.byteLength);}if(b>=c)return this;for(;b<c;)this.view.setUint8(b++,a);d&&(this.offset=b);return this};e.flip=function(){this.limit=this.offset;this.offset=0;return this};e.mark=function(a){a="undefined"===typeof a?this.offset:a;if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal offset: "+
a+" (not an integer)");a>>>=0;if(0>a||a+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+a+" (+0) <= "+this.buffer.byteLength);}this.markedOffset=a;return this};e.order=function(a){if(!this.noAssert&&"boolean"!==typeof a)throw TypeError("Illegal littleEndian: Not a boolean");this.littleEndian=!!a;return this};e.LE=function(a){this.littleEndian="undefined"!==typeof a?!!a:!0;return this};e.BE=function(a){this.littleEndian="undefined"!==typeof a?!a:!1;return this};e.prepend=function(a,
b,c){if("number"===typeof b||"string"!==typeof b)c=b,b=void 0;var d="undefined"===typeof c;d&&(c=this.offset);if(!this.noAssert){if("number"!==typeof c||0!==c%1)throw TypeError("Illegal offset: "+c+" (not an integer)");c>>>=0;if(0>c||c+0>this.buffer.byteLength)throw RangeError("Illegal offset: 0 <= "+c+" (+0) <= "+this.buffer.byteLength);}a instanceof g||(a=g.wrap(a,b));b=a.limit-a.offset;if(0>=b)return this;var f=b-c,e;if(0<f){var h=new ArrayBuffer(this.buffer.byteLength+f);e=new Uint8Array(h);e.set((new Uint8Array(this.buffer)).subarray(c,
this.buffer.byteLength),b);this.buffer=h;this.view=new DataView(h);this.offset+=f;0<=this.markedOffset&&(this.markedOffset+=f);this.limit+=f;c+=f}else e=new Uint8Array(this.buffer);e.set((new Uint8Array(a.buffer)).subarray(a.offset,a.limit),c-b);a.offset=a.limit;d&&(this.offset-=b);return this};e.prependTo=function(a,b){a.prepend(this,b);return this};e.printDebug=function(a){"function"!==typeof a&&(a=console.log.bind(console));a(this.toString()+"\n-------------------------------------------------------------------\n"+
this.toDebug(!0))};e.remaining=function(){return this.limit-this.offset};e.reset=function(){0<=this.markedOffset?(this.offset=this.markedOffset,this.markedOffset=-1):this.offset=0;return this};e.resize=function(a){if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal capacity: "+a+" (not an integer)");a|=0;if(0>a)throw RangeError("Illegal capacity: 0 <= "+a);}this.buffer.byteLength<a&&(a=new ArrayBuffer(a),(new Uint8Array(a)).set(new Uint8Array(this.buffer)),this.buffer=a,this.view=
new DataView(a));return this};e.reverse=function(a,b){"undefined"===typeof a&&(a=this.offset);"undefined"===typeof b&&(b=this.limit);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal begin: Not an integer");a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal end: Not an integer");b>>>=0;if(0>a||a>b||b>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+a+" <= "+b+" <= "+this.buffer.byteLength);}if(a===b)return this;Array.prototype.reverse.call((new Uint8Array(this.buffer)).subarray(a,
b));this.view=new DataView(this.buffer);return this};e.skip=function(a){if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal length: "+a+" (not an integer)");a|=0}var b=this.offset+a;if(!this.noAssert&&(0>b||b>this.buffer.byteLength))throw RangeError("Illegal length: 0 <= "+this.offset+" + "+a+" <= "+this.buffer.byteLength);this.offset=b;return this};e.slice=function(a,b){"undefined"===typeof a&&(a=this.offset);"undefined"===typeof b&&(b=this.limit);if(!this.noAssert){if("number"!==
typeof a||0!==a%1)throw TypeError("Illegal begin: Not an integer");a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal end: Not an integer");b>>>=0;if(0>a||a>b||b>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+a+" <= "+b+" <= "+this.buffer.byteLength);}var c=this.clone();c.offset=a;c.limit=b;return c};e.toBuffer=function(a){var b=this.offset,c=this.limit;if(b>c)var d=b,b=c,c=d;if(!this.noAssert){if("number"!==typeof b||0!==b%1)throw TypeError("Illegal offset: Not an integer");
b>>>=0;if("number"!==typeof c||0!==c%1)throw TypeError("Illegal limit: Not an integer");c>>>=0;if(0>b||b>c||c>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+b+" <= "+c+" <= "+this.buffer.byteLength);}if(!a&&0===b&&c===this.buffer.byteLength)return this.buffer;if(b===c)return s;a=new ArrayBuffer(c-b);(new Uint8Array(a)).set((new Uint8Array(this.buffer)).subarray(b,c),0);return a};e.toArrayBuffer=e.toBuffer;e.toString=function(a,b,c){if("undefined"===typeof a)return"ByteBufferAB(offset="+
this.offset+",markedOffset="+this.markedOffset+",limit="+this.limit+",capacity="+this.capacity()+")";"number"===typeof a&&(c=b=a="utf8");switch(a){case "utf8":return this.toUTF8(b,c);case "base64":return this.toBase64(b,c);case "hex":return this.toHex(b,c);case "binary":return this.toBinary(b,c);case "debug":return this.toDebug();case "columns":return this.m();default:throw Error("Unsupported encoding: "+a);}};var v=function(){for(var a={},b=[65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,
83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,48,49,50,51,52,53,54,55,56,57,43,47],c=[],d=0,f=b.length;d<f;++d)c[b[d]]=d;a.i=function(a,c){for(var d,f;null!==(d=a());)c(b[d>>2&63]),f=(d&3)<<4,null!==(d=a())?(f|=d>>4&15,c(b[(f|d>>4&15)&63]),f=(d&15)<<2,null!==(d=a())?(c(b[(f|d>>6&3)&63]),c(b[d&63])):(c(b[f&63]),c(61))):(c(b[f&63]),c(61),c(61))};a.h=function(a,b){function d(a){throw Error("Illegal character code: "+a);}for(var f,
e,g;null!==(f=a());)if(e=c[f],"undefined"===typeof e&&d(f),null!==(f=a())&&(g=c[f],"undefined"===typeof g&&d(f),b(e<<2>>>0|(g&48)>>4),null!==(f=a()))){e=c[f];if("undefined"===typeof e)if(61===f)break;else d(f);b((g&15)<<4>>>0|(e&60)>>2);if(null!==(f=a())){g=c[f];if("undefined"===typeof g)if(61===f)break;else d(f);b((e&3)<<6>>>0|g)}}};a.test=function(a){return/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(a)};return a}();e.toBase64=function(a,b){"undefined"===typeof a&&(a=
this.offset);"undefined"===typeof b&&(b=this.limit);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal begin: Not an integer");a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal end: Not an integer");b>>>=0;if(0>a||a>b||b>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+a+" <= "+b+" <= "+this.buffer.byteLength);}var c;v.i(function(){return a<b?this.view.getUint8(a++):null}.bind(this),c=t());return c()};g.fromBase64=function(a,b,c){if(!c){if("string"!==
typeof a)throw TypeError("Illegal str: Not a string");if(0!==a.length%4)throw TypeError("Illegal str: Length not a multiple of 4");}var d=new g(a.length/4*3,b,c),f=0;v.h(m(a),function(a){d.view.setUint8(f++,a)});d.limit=f;return d};g.btoa=function(a){return g.fromBinary(a).toBase64()};g.atob=function(a){return g.fromBase64(a).toBinary()};e.toBinary=function(a,b){a="undefined"===typeof a?this.offset:a;b="undefined"===typeof b?this.limit:b;if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal begin: Not an integer");
a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal end: Not an integer");b>>>=0;if(0>a||a>b||b>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+a+" <= "+b+" <= "+this.buffer.byteLength);}if(a===b)return"";for(var c=[],d=[];a<b;)c.push(this.view.getUint8(a++)),1024<=c.length&&(d.push(String.fromCharCode.apply(String,c)),c=[]);return d.join("")+String.fromCharCode.apply(String,c)};g.fromBinary=function(a,b,c){if(!c&&"string"!==typeof a)throw TypeError("Illegal str: Not a string");
for(var d=0,f=a.length,e=new g(f,b,c);d<f;){b=a.charCodeAt(d);if(!c&&255<b)throw RangeError("Illegal charCode at "+d+": 0 <= "+b+" <= 255");e.view.setUint8(d++,b)}e.limit=f;return e};e.toDebug=function(a){for(var b=-1,c=this.buffer.byteLength,d,f="",e="",g="";b<c;){-1!==b&&(d=this.view.getUint8(b),f=16>d?f+("0"+d.toString(16).toUpperCase()):f+d.toString(16).toUpperCase(),a&&(e+=32<d&&127>d?String.fromCharCode(d):"."));++b;if(a&&0<b&&0===b%16&&b!==c){for(;51>f.length;)f+=" ";g+=f+e+"\n";f=e=""}f=b===
this.offset&&b===this.limit?f+(b===this.markedOffset?"!":"|"):b===this.offset?f+(b===this.markedOffset?"[":"<"):b===this.limit?f+(b===this.markedOffset?"]":">"):f+(b===this.markedOffset?"'":a||0!==b&&b!==c?" ":"")}if(a&&" "!==f){for(;51>f.length;)f+=" ";g+=f+e+"\n"}return a?g:f};g.fromDebug=function(a,b,c){var d=a.length;b=new g((d+1)/3|0,b,c);for(var f=0,e=0,h,k=!1,l=!1,m=!1,q=!1,p=!1;f<d;){switch(h=a.charAt(f++)){case "!":if(!c){if(l||m||q){p=!0;break}l=m=q=!0}b.offset=b.markedOffset=b.limit=e;
k=!1;break;case "|":if(!c){if(l||q){p=!0;break}l=q=!0}b.offset=b.limit=e;k=!1;break;case "[":if(!c){if(l||m){p=!0;break}l=m=!0}b.offset=b.markedOffset=e;k=!1;break;case "<":if(!c){if(l){p=!0;break}l=!0}b.offset=e;k=!1;break;case "]":if(!c){if(q||m){p=!0;break}q=m=!0}b.limit=b.markedOffset=e;k=!1;break;case ">":if(!c){if(q){p=!0;break}q=!0}b.limit=e;k=!1;break;case "'":if(!c){if(m){p=!0;break}m=!0}b.markedOffset=e;k=!1;break;case " ":k=!1;break;default:if(!c&&k){p=!0;break}h=parseInt(h+a.charAt(f++),
16);if(!c&&(isNaN(h)||0>h||255<h))throw TypeError("Illegal str: Not a debug encoded string");b.view.setUint8(e++,h);k=!0}if(p)throw TypeError("Illegal str: Invalid symbol at "+f);}if(!c){if(!l||!q)throw TypeError("Illegal str: Missing offset or limit");if(e<b.buffer.byteLength)throw TypeError("Illegal str: Not a debug encoded string (is it hex?) "+e+" < "+d);}return b};e.toHex=function(a,b){a="undefined"===typeof a?this.offset:a;b="undefined"===typeof b?this.limit:b;if(!this.noAssert){if("number"!==
typeof a||0!==a%1)throw TypeError("Illegal begin: Not an integer");a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal end: Not an integer");b>>>=0;if(0>a||a>b||b>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+a+" <= "+b+" <= "+this.buffer.byteLength);}for(var c=Array(b-a),d;a<b;)d=this.view.getUint8(a++),16>d?c.push("0",d.toString(16)):c.push(d.toString(16));return c.join("")};g.fromHex=function(a,b,c){if(!c){if("string"!==typeof a)throw TypeError("Illegal str: Not a string");
if(0!==a.length%2)throw TypeError("Illegal str: Length not a multiple of 2");}var d=a.length;b=new g(d/2|0,b);for(var f,e=0,h=0;e<d;e+=2){f=parseInt(a.substring(e,e+2),16);if(!c&&(!isFinite(f)||0>f||255<f))throw TypeError("Illegal str: Contains non-hex characters");b.view.setUint8(h++,f)}b.limit=h;return b};var l=function(){var a={k:1114111,j:function(a,c){var d=null;"number"===typeof a&&(d=a,a=function(){return null});for(;null!==d||null!==(d=a());)128>d?c(d&127):(2048>d?c(d>>6&31|192):(65536>d?
c(d>>12&15|224):(c(d>>18&7|240),c(d>>12&63|128)),c(d>>6&63|128)),c(d&63|128)),d=null},g:function(a,c){function d(a){a=a.slice(0,a.indexOf(null));var b=Error(a.toString());b.name="TruncatedError";b.bytes=a;throw b;}for(var e,g,h,k;null!==(e=a());)if(0===(e&128))c(e);else if(192===(e&224))null===(g=a())&&d([e,g]),c((e&31)<<6|g&63);else if(224===(e&240))null!==(g=a())&&null!==(h=a())||d([e,g,h]),c((e&15)<<12|(g&63)<<6|h&63);else if(240===(e&248))null!==(g=a())&&null!==(h=a())&&null!==(k=a())||d([e,g,
h,k]),c((e&7)<<18|(g&63)<<12|(h&63)<<6|k&63);else throw RangeError("Illegal starting byte: "+e);},d:function(a,c){for(var d,e=null;null!==(d=null!==e?e:a());)55296<=d&&57343>=d&&null!==(e=a())&&56320<=e&&57343>=e?(c(1024*(d-55296)+e-56320+65536),e=null):c(d);null!==e&&c(e)},e:function(a,c){var d=null;"number"===typeof a&&(d=a,a=function(){return null});for(;null!==d||null!==(d=a());)65535>=d?c(d):(d-=65536,c((d>>10)+55296),c(d%1024+56320)),d=null},c:function(b,c){a.d(b,function(b){a.j(b,c)})},b:function(b,
c){a.g(b,function(b){a.e(b,c)})},f:function(a){return 128>a?1:2048>a?2:65536>a?3:4},l:function(b){for(var c,d=0;null!==(c=b());)d+=a.f(c);return d},a:function(b){var c=0,d=0;a.d(b,function(b){++c;d+=a.f(b)});return[c,d]}};return a}();e.toUTF8=function(a,b){"undefined"===typeof a&&(a=this.offset);"undefined"===typeof b&&(b=this.limit);if(!this.noAssert){if("number"!==typeof a||0!==a%1)throw TypeError("Illegal begin: Not an integer");a>>>=0;if("number"!==typeof b||0!==b%1)throw TypeError("Illegal end: Not an integer");
b>>>=0;if(0>a||a>b||b>this.buffer.byteLength)throw RangeError("Illegal range: 0 <= "+a+" <= "+b+" <= "+this.buffer.byteLength);}var c;try{l.b(function(){return a<b?this.view.getUint8(a++):null}.bind(this),c=t())}catch(d){if(a!==b)throw RangeError("Illegal range: Truncated data, "+a+" != "+b);}return c()};g.fromUTF8=function(a,b,c){if(!c&&"string"!==typeof a)throw TypeError("Illegal str: Not a string");var d=new g(l.a(m(a),!0)[1],b,c),e=0;l.c(m(a),function(a){d.view.setUint8(e++,a)});d.limit=e;return d};
return g}"function"===typeof require&&"object"===typeof module&&module&&"object"===typeof exports&&exports?module.exports=function(){var k;try{k=require("long")}catch(g){}return u(k)}():"function"===typeof define&&define.amd?define("ByteBuffer",["Long"],function(k){return u(k)}):(s.dcodeIO=s.dcodeIO||{}).ByteBuffer=u(s.dcodeIO.Long)})(this);
/*
 ProtoBuf.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 Released under the Apache License, Version 2.0
 see: https://github.com/dcodeIO/ProtoBuf.js for details
*/
(function(s){function u(n){var f={VERSION:"4.0.0-b2",WIRE_TYPES:{}};f.WIRE_TYPES.VARINT=0;f.WIRE_TYPES.BITS64=1;f.WIRE_TYPES.LDELIM=2;f.WIRE_TYPES.STARTGROUP=3;f.WIRE_TYPES.ENDGROUP=4;f.WIRE_TYPES.BITS32=5;f.PACKABLE_WIRE_TYPES=[f.WIRE_TYPES.VARINT,f.WIRE_TYPES.BITS64,f.WIRE_TYPES.BITS32];f.TYPES={int32:{name:"int32",wireType:f.WIRE_TYPES.VARINT},uint32:{name:"uint32",wireType:f.WIRE_TYPES.VARINT},sint32:{name:"sint32",wireType:f.WIRE_TYPES.VARINT},int64:{name:"int64",wireType:f.WIRE_TYPES.VARINT},
uint64:{name:"uint64",wireType:f.WIRE_TYPES.VARINT},sint64:{name:"sint64",wireType:f.WIRE_TYPES.VARINT},bool:{name:"bool",wireType:f.WIRE_TYPES.VARINT},"double":{name:"double",wireType:f.WIRE_TYPES.BITS64},string:{name:"string",wireType:f.WIRE_TYPES.LDELIM},bytes:{name:"bytes",wireType:f.WIRE_TYPES.LDELIM},fixed32:{name:"fixed32",wireType:f.WIRE_TYPES.BITS32},sfixed32:{name:"sfixed32",wireType:f.WIRE_TYPES.BITS32},fixed64:{name:"fixed64",wireType:f.WIRE_TYPES.BITS64},sfixed64:{name:"sfixed64",wireType:f.WIRE_TYPES.BITS64},
"float":{name:"float",wireType:f.WIRE_TYPES.BITS32},"enum":{name:"enum",wireType:f.WIRE_TYPES.VARINT},message:{name:"message",wireType:f.WIRE_TYPES.LDELIM},group:{name:"group",wireType:f.WIRE_TYPES.STARTGROUP}};f.ID_MIN=1;f.ID_MAX=536870911;f.ByteBuffer=n;f.Long=n.Long||null;f.convertFieldsToCamelCase=!1;f.populateAccessors=!0;f.Util=function(){Object.create||(Object.create=function(c){function e(){}if(1<arguments.length)throw Error("Object.create polyfill only accepts the first parameter.");e.prototype=
c;return new e});var c={IS_NODE:!1};try{c.IS_NODE="function"===typeof require&&"function"===typeof require("fs").readFileSync&&"function"===typeof require("path").resolve}catch(e){}c.XHR=function(){for(var c=[function(){return new XMLHttpRequest},function(){return new ActiveXObject("Msxml2.XMLHTTP")},function(){return new ActiveXObject("Msxml3.XMLHTTP")},function(){return new ActiveXObject("Microsoft.XMLHTTP")}],e=null,f=0;f<c.length;f++){try{e=c[f]()}catch(b){continue}break}if(!e)throw Error("XMLHttpRequest is not supported");
return e};c.fetch=function(e,f){f&&"function"!=typeof f&&(f=null);if(c.IS_NODE)if(f)require("fs").readFile(e,function(d,a){d?f(null):f(""+a)});else try{return require("fs").readFileSync(e)}catch(q){return null}else{var b=c.XHR();b.open("GET",e,f?!0:!1);b.setRequestHeader("Accept","text/plain");"function"===typeof b.overrideMimeType&&b.overrideMimeType("text/plain");if(f)b.onreadystatechange=function(){4==b.readyState&&(200==b.status||0==b.status&&"string"===typeof b.responseText?f(b.responseText):
f(null))},4!=b.readyState&&b.send(null);else return b.send(null),200==b.status||0==b.status&&"string"===typeof b.responseText?b.responseText:null}};c.isArray=Array.isArray||function(c){return"[object Array]"===Object.prototype.toString.call(c)};return c}();f.Lang={OPEN:"{",CLOSE:"}",OPTOPEN:"[",OPTCLOSE:"]",OPTEND:",",EQUAL:"=",END:";",STRINGOPEN:'"',STRINGCLOSE:'"',STRINGOPEN_SQ:"'",STRINGCLOSE_SQ:"'",COPTOPEN:"(",COPTCLOSE:")",DELIM:/[\s\{\}=;\[\],'"\(\)]/g,RULE:/^(?:required|optional|repeated)$/,
TYPE:/^(?:double|float|int32|uint32|sint32|int64|uint64|sint64|fixed32|sfixed32|fixed64|sfixed64|bool|string|bytes)$/,NAME:/^[a-zA-Z_][a-zA-Z_0-9]*$/,TYPEDEF:/^[a-zA-Z][a-zA-Z_0-9]*$/,TYPEREF:/^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)+$/,FQTYPEREF:/^(?:\.[a-zA-Z][a-zA-Z_0-9]*)+$/,NUMBER:/^-?(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+|([0-9]*(\.[0-9]*)?([Ee][+-]?[0-9]+)?)|inf|nan)$/,NUMBER_DEC:/^(?:[1-9][0-9]*|0)$/,NUMBER_HEX:/^0x[0-9a-fA-F]+$/,NUMBER_OCT:/^0[0-7]+$/,NUMBER_FLT:/^([0-9]*(\.[0-9]*)?([Ee][+-]?[0-9]+)?|inf|nan)$/,
ID:/^(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+)$/,NEGID:/^\-?(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+)$/,WHITESPACE:/\s/,STRING:/(?:"([^"\\]*(?:\\.[^"\\]*)*)")|(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g,BOOL:/^(?:true|false)$/i};f.DotProto=function(c,e){var f={},l=function(d){this.source=""+d;this.index=0;this.line=1;this.stack=[];this.readingString=!1;this.stringEndsWith=e.STRINGCLOSE},q=l.prototype;q._readString=function(){e.STRING.lastIndex=this.index-1;var d;if(null!==(d=e.STRING.exec(this.source)))return d=
"undefined"!==typeof d[1]?d[1]:d[2],this.index=e.STRING.lastIndex,this.stack.push(this.stringEndsWith),d;throw Error("Unterminated string at line "+this.line+", index "+this.index);};q.next=function(){if(0<this.stack.length)return this.stack.shift();if(this.index>=this.source.length)return null;if(this.readingString)return this.readingString=!1,this._readString();var d,a;do{for(d=!1;e.WHITESPACE.test(a=this.source.charAt(this.index));)if(this.index++,"\n"===a&&this.line++,this.index===this.source.length)return null;
if("/"===this.source.charAt(this.index))if("/"===this.source.charAt(++this.index)){for(;"\n"!==this.source.charAt(this.index);)if(this.index++,this.index==this.source.length)return null;this.index++;this.line++;d=!0}else if("*"===this.source.charAt(this.index)){for(a="";"*/"!==a+(a=this.source.charAt(this.index));)if(this.index++,"\n"===a&&this.line++,this.index===this.source.length)return null;this.index++;d=!0}else throw Error("Unterminated comment at line "+this.line+": /"+this.source.charAt(this.index));
}while(d);if(this.index===this.source.length)return null;d=this.index;e.DELIM.lastIndex=0;if(e.DELIM.test(this.source.charAt(d)))++d;else for(++d;d<this.source.length&&!e.DELIM.test(this.source.charAt(d));)d++;d=this.source.substring(this.index,this.index=d);d===e.STRINGOPEN?(this.readingString=!0,this.stringEndsWith=e.STRINGCLOSE):d===e.STRINGOPEN_SQ&&(this.readingString=!0,this.stringEndsWith=e.STRINGCLOSE_SQ);return d};q.peek=function(){if(0===this.stack.length){var d=this.next();if(null===d)return null;
this.stack.push(d)}return this.stack[0]};q.toString=function(){return"Tokenizer("+this.index+"/"+this.source.length+" at line "+this.line+")"};f.Tokenizer=l;var q=function(d){this.tn=new l(d)},b=q.prototype;b.parse=function(){for(var d={name:"[ROOT]","package":null,messages:[],enums:[],imports:[],options:{},services:[]},a,h=!0;a=this.tn.next();)switch(a){case "package":if(!h||null!==d["package"])throw Error("Unexpected package at line "+this.tn.line);d["package"]=this._parsePackage(a);break;case "import":if(!h)throw Error("Unexpected import at line "+
this.tn.line);d.imports.push(this._parseImport(a));break;case "message":this._parseMessage(d,null,a);h=!1;break;case "enum":this._parseEnum(d,a);h=!1;break;case "option":this._parseOption(d,a);break;case "service":this._parseService(d,a);break;case "extend":this._parseExtend(d,a);break;case "syntax":this._parseIgnoredStatement(d,a);break;default:throw Error("Unexpected token at line "+this.tn.line+": "+a);}delete d.name;return d};b._parseNumber=function(d){var a=1;"-"==d.charAt(0)&&(a=-1,d=d.substring(1));
if(e.NUMBER_DEC.test(d))return a*parseInt(d,10);if(e.NUMBER_HEX.test(d))return a*parseInt(d.substring(2),16);if(e.NUMBER_OCT.test(d))return a*parseInt(d.substring(1),8);if(e.NUMBER_FLT.test(d))return"inf"===d?Infinity*a:"nan"===d?NaN:a*parseFloat(d);throw Error("Illegal number at line "+this.tn.line+": "+(0>a?"-":"")+d);};b._parseString=function(){var d="",a,h;do{h=this.tn.next();d+=this.tn.next();a=this.tn.next();if(a!==h)throw Error("Illegal end of string at line "+this.tn.line+": "+a);a=this.tn.peek()}while(a===
e.STRINGOPEN||a===e.STRINGOPEN_SQ);return d};b._parseId=function(d,a){var h=-1,b=1;"-"==d.charAt(0)&&(b=-1,d=d.substring(1));if(e.NUMBER_DEC.test(d))h=parseInt(d);else if(e.NUMBER_HEX.test(d))h=parseInt(d.substring(2),16);else if(e.NUMBER_OCT.test(d))h=parseInt(d.substring(1),8);else throw Error("Illegal id at line "+this.tn.line+": "+(0>b?"-":"")+d);h=b*h|0;if(!a&&0>h)throw Error("Illegal id at line "+this.tn.line+": "+(0>b?"-":"")+d);return h};b._parsePackage=function(d){d=this.tn.next();if(!e.TYPEREF.test(d))throw Error("Illegal package name at line "+
this.tn.line+": "+d);var a=d;d=this.tn.next();if(d!=e.END)throw Error("Illegal end of package at line "+this.tn.line+": "+d);return a};b._parseImport=function(d){d=this.tn.peek();"public"===d&&(this.tn.next(),d=this.tn.peek());if(d!==e.STRINGOPEN&&d!==e.STRINGOPEN_SQ)throw Error("Illegal start of import at line "+this.tn.line+": "+d);var a=this._parseString();d=this.tn.next();if(d!==e.END)throw Error("Illegal end of import at line "+this.tn.line+": "+d);return a};b._parseOption=function(d,a){a=this.tn.next();
var h=!1;a==e.COPTOPEN&&(h=!0,a=this.tn.next());if(!e.TYPEREF.test(a)&&!/google\.protobuf\./.test(a))throw Error("Illegal option name in message "+d.name+" at line "+this.tn.line+": "+a);var b=a;a=this.tn.next();if(h){if(a!==e.COPTCLOSE)throw Error("Illegal end in message "+d.name+", option "+b+" at line "+this.tn.line+": "+a);b="("+b+")";a=this.tn.next();e.FQTYPEREF.test(a)&&(b+=a,a=this.tn.next())}if(a!==e.EQUAL)throw Error("Illegal operator in message "+d.name+", option "+b+" at line "+this.tn.line+
": "+a);a=this.tn.peek();if(a===e.STRINGOPEN||a===e.STRINGOPEN_SQ)h=this._parseString();else if(this.tn.next(),e.NUMBER.test(a))h=this._parseNumber(a,!0);else if(e.BOOL.test(a))h="true"===a;else if(e.TYPEREF.test(a))h=a;else throw Error("Illegal option value in message "+d.name+", option "+b+" at line "+this.tn.line+": "+a);a=this.tn.next();if(a!==e.END)throw Error("Illegal end of option in message "+d.name+", option "+b+" at line "+this.tn.line+": "+a);d.options[b]=h};b._parseIgnoredStatement=function(d,
a){var h;do{h=this.tn.next();if(null===h)throw Error("Unexpected EOF in "+d.name+", "+a+" at line "+this.tn.line);if(h===e.END)break}while(1)};b._parseService=function(d,a){a=this.tn.next();if(!e.NAME.test(a))throw Error("Illegal service name at line "+this.tn.line+": "+a);var h=a,b={name:h,rpc:{},options:{}};a=this.tn.next();if(a!==e.OPEN)throw Error("Illegal start of service "+h+" at line "+this.tn.line+": "+a);do if(a=this.tn.next(),"option"===a)this._parseOption(b,a);else if("rpc"===a)this._parseServiceRPC(b,
a);else if(a!==e.CLOSE)throw Error("Illegal type of service "+h+" at line "+this.tn.line+": "+a);while(a!==e.CLOSE);d.services.push(b)};b._parseServiceRPC=function(d,a){var b=a;a=this.tn.next();if(!e.NAME.test(a))throw Error("Illegal method name in service "+d.name+" at line "+this.tn.line+": "+a);var c=a,f={request:null,response:null,request_stream:!1,response_stream:!1,options:{}};a=this.tn.next();if(a!==e.COPTOPEN)throw Error("Illegal start of request type in service "+d.name+"#"+c+" at line "+
this.tn.line+": "+a);a=this.tn.next();"stream"===a.toLowerCase()&&(f.request_stream=!0,a=this.tn.next());if(!e.TYPEREF.test(a))throw Error("Illegal request type in service "+d.name+"#"+c+" at line "+this.tn.line+": "+a);f.request=a;a=this.tn.next();if(a!=e.COPTCLOSE)throw Error("Illegal end of request type in service "+d.name+"#"+c+" at line "+this.tn.line+": "+a);a=this.tn.next();if("returns"!==a.toLowerCase())throw Error("Illegal delimiter in service "+d.name+"#"+c+" at line "+this.tn.line+": "+
a);a=this.tn.next();if(a!=e.COPTOPEN)throw Error("Illegal start of response type in service "+d.name+"#"+c+" at line "+this.tn.line+": "+a);a=this.tn.next();"stream"===a.toLowerCase()&&(f.response_stream=!0,a=this.tn.next());f.response=a;a=this.tn.next();if(a!==e.COPTCLOSE)throw Error("Illegal end of response type in service "+d.name+"#"+c+" at line "+this.tn.line+": "+a);a=this.tn.next();if(a===e.OPEN){do if(a=this.tn.next(),"option"===a)this._parseOption(f,a);else if(a!==e.CLOSE)throw Error("Illegal start of option inservice "+
d.name+"#"+c+" at line "+this.tn.line+": "+a);while(a!==e.CLOSE);this.tn.peek()===e.END&&this.tn.next()}else if(a!==e.END)throw Error("Illegal delimiter in service "+d.name+"#"+c+" at line "+this.tn.line+": "+a);"undefined"===typeof d[b]&&(d[b]={});d[b][c]=f};b._parseMessage=function(d,a,b){var c={},f="group"===b;b=this.tn.next();if(!e.NAME.test(b))throw Error("Illegal "+(f?"group":"message")+" name"+(d?" in message "+d.name:"")+" at line "+this.tn.line+": "+b);c.name=b;if(f){b=this.tn.next();if(b!==
e.EQUAL)throw Error("Illegal id assignment after group "+c.name+" at line "+this.tn.line+": "+b);b=this.tn.next();try{a.id=this._parseId(b)}catch(g){throw Error("Illegal field id value for group "+c.name+"#"+a.name+" at line "+this.tn.line+": "+b);}c.isGroup=!0}c.fields=[];c.enums=[];c.messages=[];c.options={};c.oneofs={};b=this.tn.next();b===e.OPTOPEN&&a&&(this._parseFieldOptions(c,a,b),b=this.tn.next());if(b!==e.OPEN)throw Error("Illegal start of "+(f?"group":"message")+" "+c.name+" at line "+this.tn.line+
": "+b);do if(b=this.tn.next(),b===e.CLOSE){b=this.tn.peek();b===e.END&&this.tn.next();break}else if(e.RULE.test(b))this._parseMessageField(c,b);else if("oneof"===b)this._parseMessageOneOf(c,b);else if("enum"===b)this._parseEnum(c,b);else if("message"===b)this._parseMessage(c,null,b);else if("option"===b)this._parseOption(c,b);else if("extensions"===b)c.extensions=this._parseExtensions(c,b);else if("extend"===b)this._parseExtend(c,b);else throw Error("Illegal token in message "+c.name+" at line "+
this.tn.line+": "+b);while(1);d.messages.push(c);return c};b._parseMessageField=function(b,a){var c={},f=null;c.rule=a;c.options={};a=this.tn.next();if("group"===a){f=this._parseMessage(b,c,a);if(!/^[A-Z]/.test(f.name))throw Error("Group names must start with a capital letter");c.type=f.name;c.name=f.name.toLowerCase();a=this.tn.peek();a===e.END&&this.tn.next()}else{if(!e.TYPE.test(a)&&!e.TYPEREF.test(a))throw Error("Illegal field type in message "+b.name+" at line "+this.tn.line+": "+a);c.type=a;
a=this.tn.next();if(!e.NAME.test(a))throw Error("Illegal field name in message "+b.name+" at line "+this.tn.line+": "+a);c.name=a;a=this.tn.next();if(a!==e.EQUAL)throw Error("Illegal token in field "+b.name+"#"+c.name+" at line "+this.tn.line+": "+a);a=this.tn.next();try{c.id=this._parseId(a)}catch(k){throw Error("Illegal field id in message "+b.name+"#"+c.name+" at line "+this.tn.line+": "+a);}a=this.tn.next();a===e.OPTOPEN&&(this._parseFieldOptions(b,c,a),a=this.tn.next());if(a!==e.END)throw Error("Illegal delimiter in message "+
b.name+"#"+c.name+" at line "+this.tn.line+": "+a);}b.fields.push(c);return c};b._parseMessageOneOf=function(b,a){a=this.tn.next();if(!e.NAME.test(a))throw Error("Illegal oneof name in message "+b.name+" at line "+this.tn.line+": "+a);var c=a,f,k=[];a=this.tn.next();if(a!==e.OPEN)throw Error("Illegal start of oneof "+c+" at line "+this.tn.line+": "+a);for(;this.tn.peek()!==e.CLOSE;)f=this._parseMessageField(b,"optional"),f.oneof=c,k.push(f.id);this.tn.next();b.oneofs[c]=k};b._parseFieldOptions=function(b,
a,c){var f=!0;do{c=this.tn.next();if(c===e.OPTCLOSE)break;else if(c===e.OPTEND){if(f)throw Error("Illegal start of options in message "+b.name+"#"+a.name+" at line "+this.tn.line+": "+c);c=this.tn.next()}this._parseFieldOption(b,a,c);f=!1}while(1)};b._parseFieldOption=function(b,a,c){var f=!1;c===e.COPTOPEN&&(c=this.tn.next(),f=!0);if(!e.TYPEREF.test(c))throw Error("Illegal field option in "+b.name+"#"+a.name+" at line "+this.tn.line+": "+c);var k=c;c=this.tn.next();if(f){if(c!==e.COPTCLOSE)throw Error("Illegal delimiter in "+
b.name+"#"+a.name+" at line "+this.tn.line+": "+c);k="("+k+")";c=this.tn.next();e.FQTYPEREF.test(c)&&(k+=c,c=this.tn.next())}if(c!==e.EQUAL)throw Error("Illegal token in "+b.name+"#"+a.name+" at line "+this.tn.line+": "+c);c=this.tn.peek();if(c===e.STRINGOPEN||c===e.STRINGOPEN_SQ)b=this._parseString();else if(e.NUMBER.test(c,!0))b=this._parseNumber(this.tn.next(),!0);else if(e.BOOL.test(c))b="true"===this.tn.next().toLowerCase();else if(e.TYPEREF.test(c))b=this.tn.next();else throw Error("Illegal value in message "+
b.name+"#"+a.name+", option "+k+" at line "+this.tn.line+": "+c);a.options[k]=b};b._parseEnum=function(b,a){var c={};a=this.tn.next();if(!e.NAME.test(a))throw Error("Illegal enum name in message "+b.name+" at line "+this.tn.line+": "+a);c.name=a;a=this.tn.next();if(a!==e.OPEN)throw Error("Illegal start of enum "+c.name+" at line "+this.tn.line+": "+a);c.values=[];c.options={};do{a=this.tn.next();if(a===e.CLOSE){a=this.tn.peek();a===e.END&&this.tn.next();break}if("option"==a)this._parseOption(c,a);
else{if(!e.NAME.test(a))throw Error("Illegal name in enum "+c.name+" at line "+this.tn.line+": "+a);this._parseEnumValue(c,a)}}while(1);b.enums.push(c)};b._parseEnumValue=function(b,a){var c={};c.name=a;a=this.tn.next();if(a!==e.EQUAL)throw Error("Illegal token in enum "+b.name+" at line "+this.tn.line+": "+a);a=this.tn.next();try{c.id=this._parseId(a,!0)}catch(f){throw Error("Illegal id in enum "+b.name+" at line "+this.tn.line+": "+a);}b.values.push(c);a=this.tn.next();a===e.OPTOPEN&&(this._parseFieldOptions(b,
{options:{}},a),a=this.tn.next());if(a!==e.END)throw Error("Illegal delimiter in enum "+b.name+" at line "+this.tn.line+": "+a);};b._parseExtensions=function(b,a){var h=[];a=this.tn.next();"min"===a?h.push(c.ID_MIN):"max"===a?h.push(c.ID_MAX):h.push(this._parseNumber(a));a=this.tn.next();if("to"!==a)throw Error("Illegal extensions delimiter in message "+b.name+" at line "+this.tn.line+": "+a);a=this.tn.next();"min"===a?h.push(c.ID_MIN):"max"===a?h.push(c.ID_MAX):h.push(this._parseNumber(a));a=this.tn.next();
if(a!==e.END)throw Error("Illegal extensions delimiter in message "+b.name+" at line "+this.tn.line+": "+a);return h};b._parseExtend=function(b,a){a=this.tn.next();if(!e.TYPEREF.test(a))throw Error("Illegal message name at line "+this.tn.line+": "+a);var c={};c.ref=a;c.fields=[];a=this.tn.next();if(a!==e.OPEN)throw Error("Illegal start of extend "+c.name+" at line "+this.tn.line+": "+a);do if(a=this.tn.next(),a===e.CLOSE){a=this.tn.peek();a==e.END&&this.tn.next();break}else if(e.RULE.test(a))this._parseMessageField(c,
a);else throw Error("Illegal token in extend "+c.name+" at line "+this.tn.line+": "+a);while(1);b.messages.push(c);return c};b.toString=function(){return"Parser"};f.Parser=q;return f}(f,f.Lang);f.Reflect=function(c){function e(a,b){var d=b.readVarint32(),f=d&7,d=d>>3;switch(f){case c.WIRE_TYPES.VARINT:do d=b.readUint8();while(128===(d&128));break;case c.WIRE_TYPES.BITS64:b.offset+=8;break;case c.WIRE_TYPES.LDELIM:d=b.readVarint32();b.offset+=d;break;case c.WIRE_TYPES.STARTGROUP:e(d,b);break;case c.WIRE_TYPES.ENDGROUP:if(d===
a)return!1;throw Error("Illegal GROUPEND after unknown group: "+d+" ("+a+" expected)");case c.WIRE_TYPES.BITS32:b.offset+=4;break;default:throw Error("Illegal wire type in unknown group "+a+": "+f);}return!0}function f(a,b){if(a&&"number"===typeof a.low&&"number"===typeof a.high&&"boolean"===typeof a.unsigned&&a.low===a.low&&a.high===a.high)return new c.Long(a.low,a.high,"undefined"===typeof b?a.unsigned:b);if("string"===typeof a)return c.Long.fromString(a,b||!1,10);if("number"===typeof a)return c.Long.fromNumber(a,
b||!1);throw Error("not convertible to Long");}var l={},q=function(a,b,c){this.builder=a;this.parent=b;this.name=c},b=q.prototype;b.fqn=function(){var a=this.name,b=this;do{b=b.parent;if(null==b)break;a=b.name+"."+a}while(1);return a};b.toString=function(a){return(a?this.className+" ":"")+this.fqn()};b.build=function(){throw Error(this.toString(!0)+" cannot be built directly");};l.T=q;var d=function(a,b,c,d){q.call(this,a,b,c);this.className="Namespace";this.children=[];this.options=d||{}},b=d.prototype=
Object.create(q.prototype);b.getChildren=function(a){a=a||null;if(null==a)return this.children.slice();for(var b=[],c=0,d=this.children.length;c<d;++c)this.children[c]instanceof a&&b.push(this.children[c]);return b};b.addChild=function(b){var c;if(c=this.getChild(b.name))if(c instanceof a.Field&&c.name!==c.originalName&&null===this.getChild(c.originalName))c.name=c.originalName;else if(b instanceof a.Field&&b.name!==b.originalName&&null===this.getChild(b.originalName))b.name=b.originalName;else throw Error("Duplicate name in namespace "+
this.toString(!0)+": "+b.name);this.children.push(b)};b.getChild=function(a){for(var b="number"===typeof a?"id":"name",c=0,d=this.children.length;c<d;++c)if(this.children[c][b]===a)return this.children[c];return null};b.resolve=function(a,b){var c="string"===typeof a?a.split("."):a,d=this,e=0;if(""===c[e]){for(;null!==d.parent;)d=d.parent;e++}do{do{d=d.getChild(c[e]);if(!(d&&d instanceof l.T)||b&&d instanceof l.Message.Field){d=null;break}e++}while(e<c.length);if(null!=d)break;if(null!==this.parent)return this.parent.resolve(a,
b)}while(null!=d);return d};b.qn=function(a){var b=[],c=a;do b.unshift(c.name),c=c.parent;while(null!==c);for(c=1;c<=b.length;c++){var d=b.slice(b.length-c);if(a===this.resolve(d))return d.join(".")}return a.fqn()};b.build=function(){for(var a={},b=this.children,c=0,e=b.length,f;c<e;++c)f=b[c],f instanceof d&&(a[f.name]=f.build());Object.defineProperty&&Object.defineProperty(a,"$options",{value:this.buildOpt()});return a};b.buildOpt=function(){for(var a={},b=Object.keys(this.options),c=0,d=b.length;c<
d;++c)a[b[c]]=this.options[b[c]];return a};b.getOption=function(a){return"undefined"===typeof a?this.options:"undefined"!==typeof this.options[a]?this.options[a]:null};l.Namespace=d;var a=function(a,b,e,f,h){d.call(this,a,b,e,f);this.className="Message";this.extensions=[c.ID_MIN,c.ID_MAX];this.clazz=null;this.isGroup=!!h;this._fieldsByName=this._fieldsById=this._fields=null},h=a.prototype=Object.create(d.prototype);h.build=function(b){if(this.clazz&&!b)return this.clazz;b=function(a,b){function c(a,
b){var d={},m;for(m in a)a.hasOwnProperty(m)&&(null===a[m]||"object"!==typeof a[m]?d[m]=a[m]:a[m]instanceof n?b&&(d[m]=a[m].toBase64()):d[m]=c(a[m],b));return d}var d=b.getChildren(a.Reflect.Message.Field),m=b.getChildren(a.Reflect.Message.OneOf),e=function(b,c){a.Builder.Message.call(this);for(var e=0,p=m.length;e<p;++e)this[m[e].name]=null;e=0;for(p=d.length;e<p;++e){var f=d[e];this[f.name]=f.repeated?[]:null;f.required&&null!==f.defaultValue&&(this[f.name]=f.defaultValue)}if(0<arguments.length)if(1!==
arguments.length||"object"!==typeof b||"function"===typeof b.encode||a.Util.isArray(b)||b instanceof n||b instanceof ArrayBuffer||a.Long&&b instanceof a.Long)for(e=0,p=arguments.length;e<p;++e)"undefined"!==typeof(f=arguments[e])&&this.$set(d[e].name,f);else this.$set(b)},p=e.prototype=Object.create(a.Builder.Message.prototype);p.add=function(c,d,m){var e=b._fieldsByName[c];if(!m){if(!e)throw Error(this+"#"+c+" is undefined");if(!(e instanceof a.Reflect.Message.Field))throw Error(this+"#"+c+" is not a field: "+
e.toString(!0));if(!e.repeated)throw Error(this+"#"+c+" is not a repeated field");}null===this[e.name]&&(this[e.name]=[]);this[e.name].push(m?d:e.verifyValue(d,!0))};p.$add=p.add;p.set=function(c,d,m){if(c&&"object"===typeof c){m=d;for(var e in c)c.hasOwnProperty(e)&&"undefined"!==typeof(d=c[e])&&this.$set(e,d,m);return this}e=b._fieldsByName[c];if(m)this[e.name]=d;else{if(!e)throw Error(this+"#"+c+" is not a field: undefined");if(!(e instanceof a.Reflect.Message.Field))throw Error(this+"#"+c+" is not a field: "+
e.toString(!0));this[e.name]=d=e.verifyValue(d)}e.oneof&&(null!==d?(null!==this[e.oneof.name]&&(this[this[e.oneof.name]]=null),this[e.oneof.name]=e.name):e.oneof.name===c&&(this[e.oneof.name]=null));return this};p.$set=p.set;p.get=function(c,d){if(d)return this[c];var m=b._fieldsByName[c];if(!(m&&m instanceof a.Reflect.Message.Field))throw Error(this+"#"+c+" is not a field: undefined");if(!(m instanceof a.Reflect.Message.Field))throw Error(this+"#"+c+" is not a field: "+m.toString(!0));return this[m.name]};
p.$get=p.get;for(var f=0;f<d.length;f++){var h=d[f];h instanceof a.Reflect.Message.ExtensionField||b.builder.options.populateAccessors&&function(a){var c=a.originalName.replace(/(_[a-zA-Z])/g,function(a){return a.toUpperCase().replace("_","")}),c=c.substring(0,1).toUpperCase()+c.substring(1),d=a.originalName.replace(/([A-Z])/g,function(a){return"_"+a}),m=function(b,c){this[a.name]=c?b:a.verifyValue(b);return this},e=function(){return this[a.name]};null===b.getChild("set"+c)&&(p["set"+c]=m);null===
b.getChild("set_"+d)&&(p["set_"+d]=m);null===b.getChild("get"+c)&&(p["get"+c]=e);null===b.getChild("get_"+d)&&(p["get_"+d]=e)}(h)}p.encode=function(a,c){"boolean"===typeof a&&(c=a,a=void 0);var d=!1;a||(a=new n,d=!0);var m=a.littleEndian;try{return b.encode(this,a.LE(),c),(d?a.flip():a).LE(m)}catch(e){throw a.LE(m),e;}};p.calculate=function(){return b.calculate(this)};p.encodeDelimited=function(a){var c=!1;a||(a=new n,c=!0);var d=(new n).LE();b.encode(this,d).flip();a.writeVarint32(d.remaining());
a.append(d);return c?a.flip():a};p.encodeAB=function(){try{return this.encode().toArrayBuffer()}catch(a){throw a.encoded&&(a.encoded=a.encoded.toArrayBuffer()),a;}};p.toArrayBuffer=p.encodeAB;p.encodeNB=function(){try{return this.encode().toBuffer()}catch(a){throw a.encoded&&(a.encoded=a.encoded.toBuffer()),a;}};p.toBuffer=p.encodeNB;p.encode64=function(){try{return this.encode().toBase64()}catch(a){throw a.encoded&&(a.encoded=a.encoded.toBase64()),a;}};p.toBase64=p.encode64;p.encodeHex=function(){try{return this.encode().toHex()}catch(a){throw a.encoded&&
(a.encoded=a.encoded.toHex()),a;}};p.toHex=p.encodeHex;p.toRaw=function(a){return c(this,!!a)};e.decode=function(a,c){"string"===typeof a&&(a=n.wrap(a,c?c:"base64"));a=a instanceof n?a:n.wrap(a);var d=a.littleEndian;try{var m=b.decode(a.LE());a.LE(d);return m}catch(e){throw a.LE(d),e;}};e.decodeDelimited=function(a,c){"string"===typeof a&&(a=n.wrap(a,c?c:"base64"));a=a instanceof n?a:n.wrap(a);if(1>a.remaining())return null;var d=a.offset,m=a.readVarint32();if(a.remaining()<m)return a.offset=d,null;
try{var e=b.decode(a.slice(a.offset,a.offset+m).LE());a.offset+=m;return e}catch(p){throw a.offset+=m,p;}};e.decode64=function(a){return e.decode(a,"base64")};e.decodeHex=function(a){return e.decode(a,"hex")};p.toString=function(){return b.toString()};Object.defineProperty&&(Object.defineProperty(e,"$options",{value:b.buildOpt()}),Object.defineProperty(p,"$options",{value:e.$options}),Object.defineProperty(e,"$type",{value:b}),Object.defineProperty(p,"$type",{value:b}));return e}(c,this);this._fields=
[];this._fieldsById={};this._fieldsByName={};for(var d=0,e=this.children.length,f;d<e;d++)if(f=this.children[d],f instanceof k)b[f.name]=f.build();else if(f instanceof a)b[f.name]=f.build();else if(f instanceof a.Field)f.build(),this._fields.push(f),this._fieldsById[f.id]=f,this._fieldsByName[f.name]=f;else if(!(f instanceof a.OneOf||f instanceof g))throw Error("Illegal reflect child of "+this.toString(!0)+": "+children[d].toString(!0));return this.clazz=b};h.encode=function(a,b,c){for(var d=null,
e,f=0,h=this._fields.length,g;f<h;++f)e=this._fields[f],g=a[e.name],e.required&&null===g?null===d&&(d=e):e.encode(c?g:e.verifyValue(g),b);if(null!==d)throw a=Error("Missing at least one required field for "+this.toString(!0)+": "+d),a.encoded=b,a;return b};h.calculate=function(a){for(var b=0,c=0,d=this._fields.length,e,f;c<d;++c){e=this._fields[c];f=a[e.name];if(e.required&&null===f)throw Error("Missing at least one required field for "+this.toString(!0)+": "+e);b+=e.calculate(f)}return b};h.decode=
function(a,b,d){b="number"===typeof b?b:-1;for(var f=a.offset,h=new this.clazz,g,k,l;a.offset<f+b||-1===b&&0<a.remaining();){g=a.readVarint32();k=g&7;l=g>>3;if(k===c.WIRE_TYPES.ENDGROUP){if(l!==d)throw Error("Illegal group end indicator for "+this.toString(!0)+": "+l+" ("+(d?d+" expected":"not a group")+")");break}if(g=this._fieldsById[l])g.repeated&&!g.options.packed?h[g.name].push(g.decode(k,a)):(h[g.name]=g.decode(k,a),g.oneof&&(null!==this[g.oneof.name]&&(this[this[g.oneof.name]]=null),h[g.oneof.name]=
g.name));else switch(k){case c.WIRE_TYPES.VARINT:a.readVarint32();break;case c.WIRE_TYPES.BITS32:a.offset+=4;break;case c.WIRE_TYPES.BITS64:a.offset+=8;break;case c.WIRE_TYPES.LDELIM:g=a.readVarint32();a.offset+=g;break;case c.WIRE_TYPES.STARTGROUP:for(;e(l,a););break;default:throw Error("Illegal wire type for unknown field "+l+" in "+this.toString(!0)+"#decode: "+k);}}a=0;for(b=this._fields.length;a<b;++a)if(g=this._fields[a],null===h[g.name]){if(g.required)throw a=Error("Missing at least one required field for "+
this.toString(!0)+": "+g.name),a.decoded=h,a;null!==g.defaultValue&&(h[g.name]=g.defaultValue)}return h};l.Message=a;var r=function(b,c,d,e,f,h,g,k){q.call(this,b,c,f);this.className="Message.Field";this.required="required"===d;this.repeated="repeated"===d;this.type=e;this.resolvedType=null;this.id=h;this.options=g||{};this.defaultValue=null;this.oneof=k||null;this.originalName=this.name;!this.builder.options.convertFieldsToCamelCase||this instanceof a.ExtensionField||(this.name=r._toCamelCase(this.name))};
r._toCamelCase=function(a){return a.replace(/_([a-zA-Z])/g,function(a,b){return b.toUpperCase()})};h=r.prototype=Object.create(q.prototype);h.build=function(){this.defaultValue="undefined"!==typeof this.options["default"]?this.verifyValue(this.options["default"]):null};h.verifyValue=function(a,b){b=b||!1;var d=function(a,b){throw Error("Illegal value for "+this.toString(!0)+" of type "+this.type.name+": "+a+" ("+b+")");}.bind(this);if(null===a)return this.required&&d(typeof a,"required"),null;var e;
if(this.repeated&&!b){c.Util.isArray(a)||(a=[a]);d=[];for(e=0;e<a.length;e++)d.push(this.verifyValue(a[e],!0));return d}!this.repeated&&c.Util.isArray(a)&&d(typeof a,"no array expected");switch(this.type){case c.TYPES.int32:case c.TYPES.sint32:case c.TYPES.sfixed32:return("number"!==typeof a||a===a&&0!==a%1)&&d(typeof a,"not an integer"),4294967295<a?a|0:a;case c.TYPES.uint32:case c.TYPES.fixed32:return("number"!==typeof a||a===a&&0!==a%1)&&d(typeof a,"not an integer"),0>a?a>>>0:a;case c.TYPES.int64:case c.TYPES.sint64:case c.TYPES.sfixed64:if(c.Long)try{return f(a,
!1)}catch(h){d(typeof a,h.message)}else d(typeof a,"requires Long.js");case c.TYPES.uint64:case c.TYPES.fixed64:if(c.Long)try{return f(a,!0)}catch(g){d(typeof a,g.message)}else d(typeof a,"requires Long.js");case c.TYPES.bool:return"boolean"!==typeof a&&d(typeof a,"not a boolean"),a;case c.TYPES["float"]:case c.TYPES["double"]:return"number"!==typeof a&&d(typeof a,"not a number"),a;case c.TYPES.string:return"string"===typeof a||a&&a instanceof String||d(typeof a,"not a string"),""+a;case c.TYPES.bytes:return n.isByteBuffer(a)?
a:n.wrap(a,"base64");case c.TYPES["enum"]:var l=this.resolvedType.getChildren(k.Value);for(e=0;e<l.length;e++)if(l[e].name==a||l[e].id==a)return l[e].id;d(a,"not a valid enum value");case c.TYPES.group:case c.TYPES.message:a&&"object"===typeof a||d(typeof a,"object expected");if(a instanceof this.resolvedType.clazz)return a;if(a instanceof c.Builder.Message){d={};for(e in a)a.hasOwnProperty(e)&&(d[e]=a[e]);a=d}return new this.resolvedType.clazz(a)}throw Error("[INTERNAL] Illegal value for "+this.toString(!0)+
": "+a+" (undefined type "+this.type+")");};h.encode=function(a,b){if(null===this.type||"object"!==typeof this.type)throw Error("[INTERNAL] Unresolved type in "+this.toString(!0)+": "+this.type);if(null===a||this.repeated&&0==a.length)return b;try{if(this.repeated){var d;if(this.options.packed&&0<=c.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)){b.writeVarint32(this.id<<3|c.WIRE_TYPES.LDELIM);b.ensureCapacity(b.offset+=1);var e=b.offset;for(d=0;d<a.length;d++)this.encodeValue(a[d],b);var f=b.offset-
e,h=n.calculateVarint32(f);if(1<h){var g=b.slice(e,b.offset),e=e+(h-1);b.offset=e;b.append(g)}b.writeVarint32(f,e-h)}else for(d=0;d<a.length;d++)b.writeVarint32(this.id<<3|this.type.wireType),this.encodeValue(a[d],b)}else b.writeVarint32(this.id<<3|this.type.wireType),this.encodeValue(a,b)}catch(k){throw Error("Illegal value for "+this.toString(!0)+": "+a+" ("+k+")");}return b};h.encodeValue=function(a,b){if(null===a)return b;switch(this.type){case c.TYPES.int32:0>a?b.writeVarint64(a):b.writeVarint32(a);
break;case c.TYPES.uint32:b.writeVarint32(a);break;case c.TYPES.sint32:b.writeVarint32ZigZag(a);break;case c.TYPES.fixed32:b.writeUint32(a);break;case c.TYPES.sfixed32:b.writeInt32(a);break;case c.TYPES.int64:case c.TYPES.uint64:b.writeVarint64(a);break;case c.TYPES.sint64:b.writeVarint64ZigZag(a);break;case c.TYPES.fixed64:b.writeUint64(a);break;case c.TYPES.sfixed64:b.writeInt64(a);break;case c.TYPES.bool:"string"===typeof a?b.writeVarint32("false"===a.toLowerCase()?0:!!a):b.writeVarint32(a?1:0);
break;case c.TYPES["enum"]:b.writeVarint32(a);break;case c.TYPES["float"]:b.writeFloat32(a);break;case c.TYPES["double"]:b.writeFloat64(a);break;case c.TYPES.string:b.writeVString(a);break;case c.TYPES.bytes:if(0>a.remaining())throw Error("Illegal value for "+this.toString(!0)+": "+a.remaining()+" bytes remaining");var d=a.offset;b.writeVarint32(a.remaining());b.append(a);a.offset=d;break;case c.TYPES.message:d=(new n).LE();this.resolvedType.encode(a,d);b.writeVarint32(d.offset);b.append(d.flip());
break;case c.TYPES.group:this.resolvedType.encode(a,b);b.writeVarint32(this.id<<3|c.WIRE_TYPES.ENDGROUP);break;default:throw Error("[INTERNAL] Illegal value to encode in "+this.toString(!0)+": "+a+" (unknown type)");}return b};h.calculate=function(a){a=this.verifyValue(a);if(null===this.type||"object"!==typeof this.type)throw Error("[INTERNAL] Unresolved type in "+this.toString(!0)+": "+this.type);if(null===a||this.repeated&&0==a.length)return 0;var b=0;try{if(this.repeated){var d,e;if(this.options.packed&&
0<=c.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)){b+=n.calculateVarint32(this.id<<3|c.WIRE_TYPES.LDELIM);for(d=e=0;d<a.length;d++)e+=this.calculateValue(a[d]);b+=n.calculateVarint32(e);b+=e}else for(d=0;d<a.length;d++)b+=n.calculateVarint32(this.id<<3|this.type.wireType),b+=this.calculateValue(a[d])}else b+=n.calculateVarint32(this.id<<3|this.type.wireType),b+=this.calculateValue(a)}catch(f){throw Error("Illegal value for "+this.toString(!0)+": "+a+" ("+f+")");}return b};h.calculateValue=function(a){if(null===
a)return 0;switch(this.type){case c.TYPES.int32:return 0>a?n.calculateVarint64(a):n.calculateVarint32(a);case c.TYPES.uint32:return n.calculateVarint32(a);case c.TYPES.sint32:return n.calculateVarint32(n.zigZagEncode32(a));case c.TYPES.fixed32:case c.TYPES.sfixed32:case c.TYPES["float"]:return 4;case c.TYPES.int64:case c.TYPES.uint64:return n.calculateVarint64(a);case c.TYPES.sint64:return n.calculateVarint64(n.zigZagEncode64(a));case c.TYPES.fixed64:case c.TYPES.sfixed64:return 8;case c.TYPES.bool:return 1;
case c.TYPES["enum"]:return n.calculateVarint32(a);case c.TYPES["double"]:return 8;case c.TYPES.string:return a=n.calculateUTF8Bytes(a),n.calculateVarint32(a)+a;case c.TYPES.bytes:if(0>a.remaining())throw Error("Illegal value for "+this.toString(!0)+": "+a.remaining()+" bytes remaining");return n.calculateVarint32(a.remaining())+a.remaining();case c.TYPES.message:return a=this.resolvedType.calculate(a),n.calculateVarint32(a)+a;case c.TYPES.group:return a=this.resolvedType.calculate(a),a+n.calculateVarint32(this.id<<
3|c.WIRE_TYPES.ENDGROUP)}throw Error("[INTERNAL] Illegal value to encode in "+this.toString(!0)+": "+a+" (unknown type)");};h.decode=function(a,b,d){if(a!=this.type.wireType&&(d||a!=c.WIRE_TYPES.LDELIM||!this.repeated))throw Error("Illegal wire type for field "+this.toString(!0)+": "+a+" ("+this.type.wireType+" expected)");if(a==c.WIRE_TYPES.LDELIM&&this.repeated&&this.options.packed&&0<=c.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)&&!d){a=b.readVarint32();a=b.offset+a;for(d=[];b.offset<a;)d.push(this.decode(this.type.wireType,
b,!0));return d}switch(this.type){case c.TYPES.int32:return b.readVarint32()|0;case c.TYPES.uint32:return b.readVarint32()>>>0;case c.TYPES.sint32:return b.readVarint32ZigZag()|0;case c.TYPES.fixed32:return b.readUint32()>>>0;case c.TYPES.sfixed32:return b.readInt32()|0;case c.TYPES.int64:return b.readVarint64();case c.TYPES.uint64:return b.readVarint64().toUnsigned();case c.TYPES.sint64:return b.readVarint64ZigZag();case c.TYPES.fixed64:return b.readUint64();case c.TYPES.sfixed64:return b.readInt64();
case c.TYPES.bool:return!!b.readVarint32();case c.TYPES["enum"]:return b.readVarint32();case c.TYPES["float"]:return b.readFloat();case c.TYPES["double"]:return b.readDouble();case c.TYPES.string:return b.readVString();case c.TYPES.bytes:a=b.readVarint32();if(b.remaining()<a)throw Error("Illegal number of bytes for "+this.toString(!0)+": "+a+" required but got only "+b.remaining());d=b.clone();d.limit=d.offset+a;b.offset+=a;return d;case c.TYPES.message:return a=b.readVarint32(),this.resolvedType.decode(b,
a);case c.TYPES.group:return this.resolvedType.decode(b,-1,this.id)}throw Error("[INTERNAL] Illegal wire type for "+this.toString(!0)+": "+a);};l.Message.Field=r;h=function(a,b,c,d,e,f,h){r.call(this,a,b,c,d,e,f,h)};h.prototype=Object.create(r.prototype);l.Message.ExtensionField=h;l.Message.OneOf=function(a,b,c){q.call(this,a,b,c);this.fields=[]};var k=function(a,b,c,e){d.call(this,a,b,c,e);this.className="Enum";this.object=null};(k.prototype=Object.create(d.prototype)).build=function(){for(var a=
{},b=this.getChildren(k.Value),c=0,d=b.length;c<d;++c)a[b[c].name]=b[c].id;Object.defineProperty&&Object.defineProperty(a,"$options",{value:this.buildOpt()});return this.object=a};l.Enum=k;h=function(a,b,c,d){q.call(this,a,b,c);this.className="Enum.Value";this.id=d};h.prototype=Object.create(q.prototype);l.Enum.Value=h;var g=function(a,b,c,d){q.call(this,a,b,c);this.field=d};g.prototype=Object.create(q.prototype);l.Extension=g;h=function(a,b,c,e){d.call(this,a,b,c,e);this.className="Service";this.clazz=
null};(h.prototype=Object.create(d.prototype)).build=function(a){return this.clazz&&!a?this.clazz:this.clazz=function(a,b){for(var c=function(b){a.Builder.Service.call(this);this.rpcImpl=b||function(a,b,c){setTimeout(c.bind(this,Error("Not implemented, see: https://github.com/dcodeIO/ProtoBuf.js/wiki/Services")),0)}},d=c.prototype=Object.create(a.Builder.Service.prototype),e=b.getChildren(a.Reflect.Service.RPCMethod),f=0;f<e.length;f++)(function(a){d[a.name]=function(c,d){try{c&&c instanceof a.resolvedRequestType.clazz?
this.rpcImpl(a.fqn(),c,function(c,e){if(c)d(c);else{try{e=a.resolvedResponseType.clazz.decode(e)}catch(f){}e&&e instanceof a.resolvedResponseType.clazz?d(null,e):d(Error("Illegal response type received in service method "+b.name+"#"+a.name))}}):setTimeout(d.bind(this,Error("Illegal request type provided to service method "+b.name+"#"+a.name)),0)}catch(e){setTimeout(d.bind(this,e),0)}};c[a.name]=function(b,d,e){(new c(b))[a.name](d,e)};Object.defineProperty&&(Object.defineProperty(c[a.name],"$options",
{value:a.buildOpt()}),Object.defineProperty(d[a.name],"$options",{value:c[a.name].$options}))})(e[f]);Object.defineProperty&&(Object.defineProperty(c,"$options",{value:b.buildOpt()}),Object.defineProperty(d,"$options",{value:c.$options}),Object.defineProperty(c,"$type",{value:b}),Object.defineProperty(d,"$type",{value:b}));return c}(c,this)};l.Service=h;var t=function(a,b,c,d){q.call(this,a,b,c);this.className="Service.Method";this.options=d||{}};(t.prototype=Object.create(q.prototype)).buildOpt=
b.buildOpt;l.Service.Method=t;b=function(a,b,c,d,e,f,h,g){t.call(this,a,b,c,g);this.className="Service.RPCMethod";this.requestName=d;this.responseName=e;this.requestStream=f;this.responseStream=h;this.resolvedResponseType=this.resolvedRequestType=null};b.prototype=Object.create(t.prototype);l.Service.RPCMethod=b;return l}(f);f.Builder=function(c,e,f){var l=function(b){this.ptr=this.ns=new f.Namespace(this,null,"");this.resolved=!1;this.result=null;this.files={};this.importRoot=null;this.options=b||
{}},q=l.prototype;q.reset=function(){this.ptr=this.ns};q.define=function(b){if("string"!==typeof b||!e.TYPEREF.test(b))throw Error("Illegal package: "+b);b=b.split(".");var c,a;for(c=0;c<b.length;c++)if(!e.NAME.test(b[c]))throw Error("Illegal package: "+b[c]);for(c=0;c<b.length;c++)a=this.ptr.getChild(b[c]),null===a&&this.ptr.addChild(a=new f.Namespace(this,this.ptr,b[c])),this.ptr=a;return this};l.isValidMessage=function(b){if("string"!==typeof b.name||!e.NAME.test(b.name)||"undefined"!==typeof b.values||
"undefined"!==typeof b.rpc)return!1;var d;if("undefined"!==typeof b.fields){if(!c.Util.isArray(b.fields))return!1;var a=[],f;for(d=0;d<b.fields.length;d++){if(!l.isValidMessageField(b.fields[d]))return!1;f=parseInt(b.fields[d].id,10);if(0<=a.indexOf(f))return!1;a.push(f)}}if("undefined"!==typeof b.enums){if(!c.Util.isArray(b.enums))return!1;for(d=0;d<b.enums.length;d++)if(!l.isValidEnum(b.enums[d]))return!1}if("undefined"!==typeof b.messages){if(!c.Util.isArray(b.messages))return!1;for(d=0;d<b.messages.length;d++)if(!l.isValidMessage(b.messages[d])&&
!l.isValidExtend(b.messages[d]))return!1}return"undefined"===typeof b.extensions||c.Util.isArray(b.extensions)&&2===b.extensions.length&&"number"===typeof b.extensions[0]&&"number"===typeof b.extensions[1]?!0:!1};l.isValidMessageField=function(b){if("string"!==typeof b.rule||"string"!==typeof b.name||"string"!==typeof b.type||"undefined"===typeof b.id||!(e.RULE.test(b.rule)&&e.NAME.test(b.name)&&e.TYPEREF.test(b.type)&&e.ID.test(""+b.id)))return!1;if("undefined"!==typeof b.options){if("object"!==
typeof b.options)return!1;for(var c=Object.keys(b.options),a=0,f;a<c.length;a++)if("string"!==typeof(f=c[a])||"string"!==typeof b.options[f]&&"number"!==typeof b.options[f]&&"boolean"!==typeof b.options[f])return!1}return!0};l.isValidEnum=function(b){if("string"!==typeof b.name||!e.NAME.test(b.name)||"undefined"===typeof b.values||!c.Util.isArray(b.values)||0==b.values.length)return!1;for(var d=0;d<b.values.length;d++)if("object"!=typeof b.values[d]||"string"!==typeof b.values[d].name||"undefined"===
typeof b.values[d].id||!e.NAME.test(b.values[d].name)||!e.NEGID.test(""+b.values[d].id))return!1;return!0};q.create=function(b){if(!b)return this;c.Util.isArray(b)||(b=[b]);if(0===b.length)return this;var d=[];for(d.push(b);0<d.length;){b=d.pop();if(c.Util.isArray(b))for(;0<b.length;){var a=b.shift();if(l.isValidMessage(a)){var e=new f.Message(this,this.ptr,a.name,a.options,a.isGroup),q={};if(a.oneofs)for(var k=Object.keys(a.oneofs),g=0,n=k.length;g<n;++g)e.addChild(q[k[g]]=new f.Message.OneOf(this,
e,k[g]));if(a.fields&&0<a.fields.length)for(g=0,n=a.fields.length;g<n;++g){k=a.fields[g];if(null!==e.getChild(k.id))throw Error("Duplicate field id in message "+e.name+": "+k.id);if(k.options)for(var m=Object.keys(k.options),p=0,s=m.length;p<s;++p){if("string"!==typeof m[p])throw Error("Illegal field option name in message "+e.name+"#"+k.name+": "+m[p]);if("string"!==typeof k.options[m[p]]&&"number"!==typeof k.options[m[p]]&&"boolean"!==typeof k.options[m[p]])throw Error("Illegal field option value in message "+
e.name+"#"+k.name+"#"+m[p]+": "+k.options[m[p]]);}m=null;if("string"===typeof k.oneof&&(m=q[k.oneof],"undefined"===typeof m))throw Error("Illegal oneof in message "+e.name+"#"+k.name+": "+k.oneof);k=new f.Message.Field(this,e,k.rule,k.type,k.name,k.id,k.options,m);m&&m.fields.push(k);e.addChild(k)}q=[];if("undefined"!==typeof a.enums&&0<a.enums.length)for(g=0;g<a.enums.length;g++)q.push(a.enums[g]);if(a.messages&&0<a.messages.length)for(g=0;g<a.messages.length;g++)q.push(a.messages[g]);a.extensions&&
(e.extensions=a.extensions,e.extensions[0]<c.ID_MIN&&(e.extensions[0]=c.ID_MIN),e.extensions[1]>c.ID_MAX&&(e.extensions[1]=c.ID_MAX));this.ptr.addChild(e);0<q.length&&(d.push(b),b=q,this.ptr=e)}else if(l.isValidEnum(a)){e=new f.Enum(this,this.ptr,a.name,a.options);for(g=0;g<a.values.length;g++)e.addChild(new f.Enum.Value(this,e,a.values[g].name,a.values[g].id));this.ptr.addChild(e)}else if(l.isValidService(a)){e=new f.Service(this,this.ptr,a.name,a.options);for(g in a.rpc)a.rpc.hasOwnProperty(g)&&
e.addChild(new f.Service.RPCMethod(this,e,g,a.rpc[g].request,a.rpc[g].response,a.rpc[g].request_stream,a.rpc[g].response_stream,a.rpc[g].options));this.ptr.addChild(e)}else if(l.isValidExtend(a))if(e=this.ptr.resolve(a.ref))for(g=0;g<a.fields.length;g++){if(null!==e.getChild(a.fields[g].id))throw Error("Duplicate extended field id in message "+e.name+": "+a.fields[g].id);if(a.fields[g].id<e.extensions[0]||a.fields[g].id>e.extensions[1])throw Error("Illegal extended field id in message "+e.name+": "+
a.fields[g].id+" ("+e.extensions.join(" to ")+" expected)");q=a.fields[g].name;this.options.convertFieldsToCamelCase&&(q=f.Message.Field._toCamelCase(a.fields[g].name));k=new f.Message.ExtensionField(this,e,a.fields[g].rule,a.fields[g].type,this.ptr.fqn()+"."+q,a.fields[g].id,a.fields[g].options);q=new f.Extension(this,this.ptr,a.fields[g].name,k);k.extension=q;this.ptr.addChild(q);e.addChild(k)}else{if(!/\.?google\.protobuf\./.test(a.ref))throw Error("Extended message "+a.ref+" is not defined");
}else throw Error("Not a valid definition: "+JSON.stringify(a));}else throw Error("Not a valid namespace: "+JSON.stringify(b));this.ptr=this.ptr.parent}this.resolved=!1;this.result=null;return this};q["import"]=function(b,d){if("string"===typeof d){c.Util.IS_NODE&&(d=require("path").resolve(d));if(!0===this.files[d])return this.reset(),this;this.files[d]=!0}else if("object"==typeof d){var a=d.root;c.Util.IS_NODE&&(a=require("path").resolve(a));a=[a,d.file].join("/");if(!0===this.files[a])return this.reset(),
this;this.files[a]=!0}if(b.imports&&0<b.imports.length){var e="/",f=!1;if("object"===typeof d){if(this.importRoot=d.root,f=!0,a=this.importRoot,d=d.file,0<=a.indexOf("\\")||0<=d.indexOf("\\"))e="\\"}else"string"===typeof d?this.importRoot?a=this.importRoot:0<=d.indexOf("/")?(a=d.replace(/\/[^\/]*$/,""),""===a&&(a="/")):0<=d.indexOf("\\")?(a=d.replace(/\\[^\\]*$/,""),e="\\"):a=".":a=null;for(var k=0;k<b.imports.length;k++)if("string"===typeof b.imports[k]){if(!a)throw Error("Cannot determine import root: File name is unknown");
var g=b.imports[k];if(!/^google\/protobuf\//.test(g)&&(g=a+e+g,!0!==this.files[g])){/\.proto$/i.test(g)&&!c.DotProto&&(g=g.replace(/\.proto$/,".json"));var l=c.Util.fetch(g);if(null===l)throw Error("Failed to import '"+g+"' in '"+d+"': File not found");if(/\.json$/i.test(g))this["import"](JSON.parse(l+""),g);else this["import"]((new c.DotProto.Parser(l+"")).parse(),g)}}else if(d)if(/\.(\w+)$/.test(d))this["import"](b.imports[k],d.replace(/^(.+)\.(\w+)$/,function(a,b,c){return b+"_import"+k+"."+c}));
else this["import"](b.imports[k],d+"_import"+k);else this["import"](b.imports[k]);f&&(this.importRoot=null)}b["package"]&&this.define(b["package"]);var m=this.ptr;b.options&&Object.keys(b.options).forEach(function(a){m.options[a]=b.options[a]});b.messages&&(this.create(b.messages),this.ptr=m);b.enums&&(this.create(b.enums),this.ptr=m);b.services&&(this.create(b.services),this.ptr=m);b["extends"]&&this.create(b["extends"]);this.reset();return this};l.isValidService=function(b){return!("string"!==typeof b.name||
!e.NAME.test(b.name)||"object"!==typeof b.rpc)};l.isValidExtend=function(b){if("string"!==typeof b.ref||!e.TYPEREF.test(b.ref))return!1;var d;if("undefined"!==typeof b.fields){if(!c.Util.isArray(b.fields))return!1;var a=[],f;for(d=0;d<b.fields.length;d++){if(!l.isValidMessageField(b.fields[d]))return!1;f=parseInt(b.id,10);if(0<=a.indexOf(f))return!1;a.push(f)}}return!0};q.resolveAll=function(){var b;if(null!=this.ptr&&"object"!==typeof this.ptr.type){if(this.ptr instanceof f.Namespace){b=this.ptr.children;
for(var d=0,a=b.length;d<a;++d)this.ptr=b[d],this.resolveAll()}else if(this.ptr instanceof f.Message.Field)if(e.TYPE.test(this.ptr.type))this.ptr.type=c.TYPES[this.ptr.type];else{if(!e.TYPEREF.test(this.ptr.type))throw Error("Illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.type);b=(this.ptr instanceof f.Message.ExtensionField?this.ptr.extension.parent:this.ptr.parent).resolve(this.ptr.type,!0);if(!b)throw Error("Unresolvable type reference in "+this.ptr.toString(!0)+": "+this.ptr.type);
this.ptr.resolvedType=b;if(b instanceof f.Enum)this.ptr.type=c.TYPES["enum"];else if(b instanceof f.Message)this.ptr.type=b.isGroup?c.TYPES.group:c.TYPES.message;else throw Error("Illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.type);}else if(!(this.ptr instanceof c.Reflect.Enum.Value))if(this.ptr instanceof c.Reflect.Service.Method)if(this.ptr instanceof c.Reflect.Service.RPCMethod){b=this.ptr.parent.resolve(this.ptr.requestName);if(!(b&&b instanceof c.Reflect.Message))throw Error("Illegal type reference in "+
this.ptr.toString(!0)+": "+this.ptr.requestName);this.ptr.resolvedRequestType=b;b=this.ptr.parent.resolve(this.ptr.responseName);if(!(b&&b instanceof c.Reflect.Message))throw Error("Illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.responseName);this.ptr.resolvedResponseType=b}else throw Error("Illegal service type in "+this.ptr.toString(!0));else if(!(this.ptr instanceof c.Reflect.Message.OneOf||this.ptr instanceof c.Reflect.Extension))throw Error("Illegal object in namespace: "+typeof this.ptr+
":"+this.ptr);this.reset()}};q.build=function(b){this.reset();this.resolved||(this.resolveAll(),this.resolved=!0,this.result=null);null===this.result&&(this.result=this.ns.build());if(b){b="string"===typeof b?b.split("."):b;for(var c=this.result,a=0;a<b.length;a++)if(c[b[a]])c=c[b[a]];else{c=null;break}return c}return this.result};q.lookup=function(b){return b?this.ns.resolve(b):this.ns};q.toString=function(){return"Builder"};l.Message=function(){};l.Service=function(){};return l}(f,f.Lang,f.Reflect);
f.loadProto=function(c,e,n){if("string"===typeof e||e&&"string"===typeof e.file&&"string"===typeof e.root)n=e,e=void 0;return f.loadJson((new f.DotProto.Parser(c)).parse(),e,n)};f.protoFromString=f.loadProto;f.loadProtoFile=function(c,e,n){e&&"object"===typeof e?(n=e,e=null):e&&"function"===typeof e||(e=null);if(e)return f.Util.fetch("string"===typeof c?c:c.root+"/"+c.file,function(l){if(null===l)e(Error("Failed to fetch file"));else try{e(null,f.loadProto(l,n,c))}catch(b){e(b)}});var l=f.Util.fetch("object"===
typeof c?c.root+"/"+c.file:c);return null===l?null:f.loadProto(l,n,c)};f.protoFromFile=f.loadProtoFile;f.newBuilder=function(c){c=c||{};"undefined"===typeof c.convertFieldsToCamelCase&&(c.convertFieldsToCamelCase=f.convertFieldsToCamelCase);"undefined"===typeof c.populateAccessors&&(c.populateAccessors=f.populateAccessors);return new f.Builder(c)};f.loadJson=function(c,e,n){if("string"===typeof e||e&&"string"===typeof e.file&&"string"===typeof e.root)n=e,e=null;e&&"object"===typeof e||(e=f.newBuilder());
"string"===typeof c&&(c=JSON.parse(c));e["import"](c,n);e.resolveAll();return e};f.loadJsonFile=function(c,e,n){e&&"object"===typeof e?(n=e,e=null):e&&"function"===typeof e||(e=null);if(e)return f.Util.fetch("string"===typeof c?c:c.root+"/"+c.file,function(l){if(null===l)e(Error("Failed to fetch file"));else try{e(null,f.loadJson(JSON.parse(l),n,c))}catch(b){e(b)}});var l=f.Util.fetch("object"===typeof c?c.root+"/"+c.file:c);return null===l?null:f.loadJson(JSON.parse(l),n,c)};return f}"function"===
typeof require&&"object"===typeof module&&module&&"object"===typeof exports&&exports?module.exports=u(require("bytebuffer")):"function"===typeof define&&define.amd?define(["ByteBuffer"],u):(s.dcodeIO=s.dcodeIO||{}).ProtoBuf=u(s.dcodeIO.ByteBuffer)})(this);

