/** Reference study drawn entirely as editable vector shapes. No image pixels in the artwork. */
import { mkdir } from "node:fs/promises";
import type { PaintDocument, PaintFill, PaintShape } from "../src/paint-document.ts";
import { parsePaintDocument } from "../src/validate-document.ts";
import { renderDocumentToPng } from "../src/render-document.ts";
import { renderDocumentToSvg } from "../src/render-svg.ts";

const shapes: PaintShape[] = [];
let layer = 0;
let group = "hair-back";
const edges = "#42656a";
type Stop = { offset: number; color: string };
const stops = (colors: string[]): Stop[] =>
  colors.map((color, i) => ({ offset: i / (colors.length - 1), color }));
function linear(x1: number, y1: number, x2: number, y2: number, colors: string[]): PaintFill {
  return { kind: "linear", x1, y1, x2, y2, stops: stops(colors) };
}
function radial(cx: number, cy: number, r: number, colors: string[]): PaintFill {
  return { kind: "radial", cx, cy, r, stops: stops(colors) };
}
function shape(
  d: string,
  fill: PaintFill,
  stroke = edges,
  width = 1.6,
  opacity = 1,
  clip?: string,
): void {
  layer += 1;
  shapes.push({
    id: `${group}-${String(layer)}`,
    group,
    layer,
    kind: "curve",
    phase: "base",
    d,
    fill,
    stroke,
    strokeWidth: width,
    opacity,
    ...(clip === undefined ? {} : { clip }),
  });
}
function line(d: string, color = edges, width = 1.4, opacity = 1, clip?: string): void {
  layer += 1;
  shapes.push({
    id: `${group}-${String(layer)}`,
    group,
    layer,
    kind: "curve",
    phase: "lineart",
    d,
    stroke: color,
    strokeWidth: width,
    opacity,
    ...(clip === undefined ? {} : { clip }),
  });
}
function oval(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: PaintFill,
  opacity = 1,
  clip?: string,
): void {
  const k = 0.55228475;
  shape(
    `M ${String(cx - rx)} ${String(cy)} C ${String(cx - rx)} ${String(cy - ry * k)} ${String(cx - rx * k)} ${String(cy - ry)} ${String(cx)} ${String(cy - ry)} C ${String(cx + rx * k)} ${String(cy - ry)} ${String(cx + rx)} ${String(cy - ry * k)} ${String(cx + rx)} ${String(cy)} C ${String(cx + rx)} ${String(cy + ry * k)} ${String(cx + rx * k)} ${String(cy + ry)} ${String(cx)} ${String(cy + ry)} C ${String(cx - rx * k)} ${String(cy + ry)} ${String(cx - rx)} ${String(cy + ry * k)} ${String(cx - rx)} ${String(cy)} Z`,
    fill,
    "#00000000",
    0,
    opacity,
    clip,
  );
}
const tailLeft =
  "M 165 135 C 118 110 97 127 71 166 C 36 218 24 272 24 351 C 21 486 17 603 20 765 L 16 1073 L 141 1073 C 155 914 158 758 159 627 C 157 478 188 320 213 219 Z";
const tailRight =
  "M 699 139 C 742 114 767 125 797 173 C 829 224 839 303 842 393 C 847 576 849 835 848 1073 L 716 1073 C 712 894 699 717 703 535 C 706 411 678 317 674 236 Z";
shape(
  tailLeft,
  linear(23, 450, 189, 475, ["#80c9ca", "#71c3c6", "#58aeb6", "#47949f"]),
  edges,
  2.2,
);
shape(
  tailRight,
  linear(680, 440, 850, 452, ["#448e99", "#66b9bf", "#7bc8ca", "#65b9bc"]),
  edges,
  2.2,
);
shape(
  "M 42 309 C 49 205 92 143 139 142 C 97 170 80 231 61 311 C 49 371 42 425 29 476 C 35 414 35 366 42 309 Z",
  "#9bd8d5",
  "#00000000",
  0,
  0.42,
);
shape(
  "M 124 294 C 82 490 55 695 37 878 L 17 1073 L 59 1073 C 80 832 105 620 144 431 Z",
  linear(33, 600, 140, 605, ["#61b1b8", "#55a4ae", "#62b7be"]),
  "#00000000",
  0,
);
shape(
  "M 161 337 C 133 565 131 827 121 1073 L 142 1073 C 156 836 158 664 159 540 Z",
  "#3d929e",
  "#00000000",
  0,
  0.5,
);
shape(
  "M 734 163 C 774 163 804 260 812 359 C 795 290 773 225 740 200 Z",
  "#a0d9d5",
  "#00000000",
  0,
  0.3,
);
shape(
  "M 712 337 C 719 561 724 847 776 1073 L 815 1073 C 747 820 752 543 737 406 Z",
  "#8bd1ce",
  "#00000000",
  0,
  0.45,
);
shape(
  "M 688 276 C 719 415 718 497 710 603 C 703 723 708 843 731 1016 C 695 883 691 700 692 551 Z",
  "#3d909b",
  "#00000000",
  0,
  0.45,
);
for (let i = 0; i < 10; i++) {
  const x = 36 + i * 11;
  line(
    `M ${String(x + 36)} ${String(221 + i * 11)} C ${String(x + 8)} 435 ${String(x - 20)} 787 ${String(x - 22)} 1066`,
    i % 3 === 0 ? "#b0e0dc" : "#398e9c",
    i % 3 === 0 ? 1.8 : 1.1,
    0.12,
    tailLeft,
  );
  const r = 715 + i * 12;
  line(
    `M ${String(r - 14)} ${String(231 + i * 7)} C ${String(r + 8)} 473 ${String(r - 10)} 782 ${String(r + 33)} 1070`,
    i % 3 === 0 ? "#c1e7de" : "#408f9b",
    1.3,
    0.12,
    tailRight,
  );
}
group = "hair-under";
const cap =
  "M 164 438 C 154 292 215 161 338 95 C 376 70 402 62 425 64 C 478 39 560 77 622 112 C 681 151 713 233 719 342 C 735 463 701 597 649 659 C 610 700 586 721 552 725 L 535 694 L 347 728 L 296 711 C 236 684 174 588 164 438 Z";
shape(cap, linear(177, 166, 702, 664, ["#5cabb3", "#72bfc3", "#3b8996"]), edges, 2.5);
group = "body";
const skinLeft =
  "M 269 839 C 236 853 193 855 162 858 C 112 864 82 903 71 954 L 56 1073 L 226 1073 L 297 892 Z";
const skinRight =
  "M 602 838 C 642 854 702 856 730 864 C 774 875 788 929 791 970 L 804 1073 L 649 1073 L 578 898 Z";
shape(skinLeft, linear(146, 855, 196, 1073, ["#f9dbcd", "#ffebde", "#f9dfd3"]), "#6c7275", 2.2);
shape(skinRight, linear(629, 873, 785, 1019, ["#f5d1c4", "#ffeadd", "#ffeadd"]), "#6c7275", 2.2);
shape(
  "M 255 849 Q 252 907 224 977 L 219 1073 L 193 1073 C 207 995 232 928 236 856 Z",
  "#e8b4a9",
  "#00000000",
  0,
  0.7,
  skinLeft,
);
shape(
  "M 619 850 Q 626 933 652 1007 L 672 1073 L 688 1073 C 663 987 650 909 645 854 Z",
  "#edbfb2",
  "#00000000",
  0,
  0.7,
  skinRight,
);
shape(
  "M 164 967 C 171 1003 183 1046 192 1073 L 181 1073 C 176 1032 167 1002 164 967 Z",
  linear(162, 986, 183, 1060, ["#f4cdbf", "#bc807f"]),
  "#00000000",
  0,
  0.7,
);
shape(
  "M 700 969 C 694 1017 687 1047 678 1073 L 687 1073 C 692 1032 699 1008 700 969 Z",
  linear(700, 986, 681, 1060, ["#f6d4c5", "#bd8483"]),
  "#00000000",
  0,
  0.65,
);
const vest =
  "M 269 839 L 351 815 L 510 810 L 608 840 C 623 891 636 972 672 1073 L 195 1073 C 225 990 244 899 269 839 Z";
shape(
  vest,
  linear(234, 886, 638, 1008, ["#b9c2ce", "#d3d8df", "#dce0e5", "#bdc8d2"]),
  "#667883",
  2.2,
);
shape(
  "M 284 848 Q 289 943 321 993 C 278 976 260 1002 239 1073 L 207 1073 Q 247 945 259 857 Z",
  "#9eacbd",
  "#00000000",
  0,
  0.36,
  vest,
);
shape(
  "M 578 851 Q 577 933 548 975 C 599 980 625 1019 641 1073 L 672 1073 Q 630 953 619 866 Z",
  "#a4afc1",
  "#00000000",
  0,
  0.3,
  vest,
);
line("M 275 848 C 260 915 244 1002 215 1073", "#eef0ee", 3, 0.6);
line("M 604 849 C 622 929 638 1008 661 1073", "#f0f2ef", 2.5, 0.6);
group = "neck";
const neck = "M 368 693 L 511 689 L 513 784 L 528 804 L 435 860 L 352 804 L 367 784 Z";
shape(neck, linear(386, 708, 460, 830, ["#d79b91", "#edb7a6", "#f5c7b3"]), "#5b6267", 2.1);
shape(
  "M 369 704 Q 438 758 511 706 L 511 750 Q 477 779 450 779 Q 416 771 369 740 Z",
  "#c3827e",
  "#00000000",
  0,
  0.23,
  neck,
);
oval(438, 797, 72, 60, radial(438, 797, 73, ["#ffe1c9", "#ffe1c900"]), 0.55, neck);
group = "collar";
shape(
  "M 367 757 C 354 751 350 769 341 792 C 328 818 316 824 299 835 C 292 861 300 906 314 951 C 354 926 392 884 422 844 C 404 820 382 815 368 786 Z",
  linear(316, 781, 407, 899, ["#8c9cac", "#b2bfca", "#ced7de"]),
  "#5f7480",
  2.1,
);
shape(
  "M 511 755 C 527 751 529 774 540 794 C 552 814 565 825 580 836 C 583 875 573 919 556 953 C 517 930 484 891 453 846 C 469 820 497 811 511 783 Z",
  linear(540, 780, 477, 911, ["#899baa", "#bdc8d0", "#d0d9df"]),
  "#5f7480",
  2.1,
);
line("M 298 837 C 294 874 304 919 315 944 C 353 919 387 882 413 849", "#329ca9", 5.5, 0.8);
line("M 579 837 C 580 878 570 921 555 945 C 517 922 485 884 461 851", "#3196a2", 5.5, 0.8);
line("M 304 839 C 301 875 309 917 318 936 Q 369 899 405 851", "#a8e1de", 2, 0.8);
line("M 573 840 C 574 878 564 918 553 938 Q 503 901 469 853", "#a6e0db", 2, 0.75);
line("M 353 777 Q 355 762 365 762 M 514 761 Q 523 760 526 777", "#657683", 1.5);
oval(538, 904, 7, 11, "#8bbfc5", 0.55);
group = "tie";
shape(
  "M 421 834 L 435 850 L 450 833 L 469 866 L 403 868 Z",
  linear(411, 843, 462, 860, ["#2b6d7b", "#458c98", "#286a79"]),
  "#345964",
  2,
);
shape(
  "M 408 933 C 403 971 397 1012 391 1073 L 475 1073 C 470 1012 466 969 459 934 Z",
  linear(391, 965, 475, 969, ["#3d98a5", "#58b6bd", "#4ca9b2", "#2f8797"]),
  "#37717e",
  2.1,
);
shape(
  "M 420 937 C 415 964 421 995 430 1003 C 441 980 440 955 437 936 Z",
  linear(423, 940, 433, 995, ["#277c8f", "#3496a3", "#50b0b7"]),
  "#00000000",
  0,
  0.75,
);
shape(
  "M 392 868 Q 434 842 479 868 L 460 940 Q 434 929 409 941 Z",
  linear(409, 861, 459, 941, ["#348e9c", "#4daeb7", "#51b4bb"]),
  "#2d6c78",
  2.3,
);
shape("M 395 870 Q 435 854 476 871 L 471 892 Q 433 874 401 893 Z", "#2e8e9c", "#00000000", 0, 0.4);
line("M 403 897 L 413 931 Q 435 926 453 932", "#81cecc", 1.2, 0.6);
group = "arm-mark";
line(
  "M 755 1004 C 756 991 773 992 773 1003 L 777 1043 C 777 1055 759 1055 759 1045 Z",
  "#de3e5b",
  5.2,
);
line("M 779 1001 L 785 996 L 790 1050", "#df3757", 4.8);
line("M 755 1061 L 791 1058", "#e8808e", 1.3, 0.7);
group = "face";
const face =
  "M 263 420 C 268 345 302 274 364 249 C 435 222 524 246 571 312 C 604 357 624 419 624 490 C 625 557 611 617 581 654 C 550 695 492 726 441 741 C 432 744 421 738 407 734 C 355 718 309 694 279 658 C 248 619 236 560 242 493 C 244 465 252 441 263 420 Z";
shape(
  face,
  linear(440, 307, 440, 745, ["#f0c1b1", "#fbe1d2", "#ffebdf", "#fce6d8"]),
  "#617275",
  2.1,
);
oval(441, 560, 213, 180, radial(441, 560, 213, ["#fff0e5", "#fff0e500"]), 0.5, face);
shape(
  "M 263 439 C 252 513 248 603 283 651 Q 331 706 408 733 C 338 716 285 687 261 638 C 237 587 236 509 248 464 Z",
  "#e5b8aa",
  "#00000000",
  0,
  0.35,
  face,
);
shape(
  "M 594 403 C 622 488 624 580 583 649 C 602 612 604 551 601 511 Z",
  "#e3b6a9",
  "#00000000",
  0,
  0.28,
  face,
);
oval(289, 576, 65, 49, radial(289, 576, 48, ["#f4b5a750", "#f7cab120", "#f7cab100"]), 0.6, face);
oval(576, 572, 63, 47, radial(576, 572, 46, ["#f2b3a350", "#f7cab120", "#f7cab100"]), 0.6, face);
oval(427, 591, 5, 6, radial(427, 591, 7, ["#d7a89780", "#e8bda900"]), 0.55);
line("M 425 588 Q 422 593 427 595", "#d7a89b", 1, 0.3);
// Eyelids and iris geometry. The two eyes are intentionally slightly different.
group = "eye-left";
const eyeL =
  "M 244 501 C 267 466 310 462 343 482 C 356 490 363 500 365 509 C 355 542 342 559 312 560 C 280 560 255 542 244 518 Z";
shape(
  "M 248 483 C 267 452 306 446 337 464 C 350 471 362 484 369 498 C 348 475 324 466 301 466 C 279 465 261 474 248 490 Z",
  linear(309, 450, 309, 490, ["#c99893", "#e6b9a8", "#f8daca"]),
  "#00000000",
  0,
  0.6,
);
shape(eyeL, linear(303, 472, 303, 557, ["#b3b7c0", "#e4e6e7", "#fffdf5"]), "#857678", 1);
const irisL =
  "M 288 481 C 303 472 334 477 346 488 C 355 515 350 541 333 556 Q 316 565 302 553 C 285 536 279 504 288 481 Z";
shape(
  irisL,
  linear(316, 480, 317, 558, ["#28515e", "#347889", "#419eaa", "#87d6cd"]),
  "#467f85",
  1.2,
);
oval(317, 535, 30, 30, radial(317, 540, 37, ["#91e2d5b0", "#5bc8c680", "#398b9900"]), 0.9, irisL);
shape(
  "M 311 493 C 321 488 331 496 332 510 C 333 524 328 532 323 534 C 315 531 311 518 311 506 Z",
  linear(318, 493, 325, 534, ["#183f4c", "#205666", "#2b7784"]),
  "#00000000",
  0,
);
shape(
  "M 286 486 C 302 477 326 479 345 491 L 348 505 Q 318 487 285 501 Z",
  "#204b5b",
  "#00000000",
  0,
  0.42,
  irisL,
);
for (let i = 0; i < 13; i++) {
  const a = (i / 12) * Math.PI;
  const x1 = 319 + 19 * Math.cos(a),
    y1 = 517 + 22 * Math.sin(a),
    x2 = 319 + 27 * Math.cos(a),
    y2 = 517 + 35 * Math.sin(a);
  line(
    `M ${String(x1)} ${String(y1)} Q ${String((x1 + x2) / 2 + 2)} ${String((y1 + y2) / 2)} ${String(x2)} ${String(y2)}`,
    i % 2 ? "#b4eee0" : "#2b7e8c",
    1,
    0.3,
    irisL,
  );
}
oval(298, 491, 8, 5.5, "#fafff5", 0.95);
oval(299, 487, 4, 3.5, "#ffffff", 0.9);
oval(339, 527, 3, 4, "#b4f4e5", 0.6);
line("M 300 553 Q 317 561 330 555", "#adf0dc", 1.8, 0.6);
shape(
  "M 238 500 C 244 494 248 489 252 485 L 257 471 Q 257 478 262 480 L 267 474 L 272 463 Q 273 469 278 471 C 307 459 339 468 353 484 L 368 506 C 349 490 333 480 311 479 C 283 476 262 488 251 509 L 258 532 C 245 524 239 512 238 500 Z",
  "#242a30",
  "#00000000",
  0,
);
// The lash flicks are part of the eyelid contour. Reserve the removed part's ID.
layer += 1;
line("M 264 540 Q 282 558 302 559", "#9f9089", 1.5, 0.6);
line("M 264 454 C 298 441 340 453 359 478", "#b38584", 2, 0.35);
group = "eye-right";
const eyeR =
  "M 490 503 C 503 471 535 457 565 463 C 587 467 604 480 614 495 C 604 525 582 548 550 552 C 518 556 498 537 490 516 Z";
shape(
  "M 486 488 C 506 456 548 442 579 454 C 593 460 604 471 611 483 C 583 462 546 457 520 473 L 488 499 Z",
  linear(545, 448, 545, 491, ["#cfa098", "#edc7b7", "#f9dcca"]),
  "#00000000",
  0,
  0.65,
);
shape(eyeR, linear(550, 466, 550, 551, ["#b4b7c2", "#e4e7e7", "#fffef5"]), "#8b7a7a", 1);
const irisR =
  "M 507 479 C 524 465 553 467 568 477 C 578 498 575 529 559 547 C 546 555 531 553 520 544 C 506 527 501 499 507 479 Z";
shape(
  irisR,
  linear(538, 472, 539, 550, ["#234d59", "#327c8c", "#49aab1", "#8bd8cc"]),
  "#45848a",
  1.2,
);
oval(538, 532, 30, 30, radial(539, 541, 37, ["#9ae9d6b0", "#60cfc980", "#3c939a00"]), 0.8, irisR);
shape(
  "M 531 487 C 541 481 549 489 549 503 C 549 516 545 526 539 528 C 532 524 528 513 529 502 Z",
  linear(538, 486, 540, 529, ["#163d48", "#205b68", "#2b7c84"]),
  "#00000000",
  0,
);
shape(
  "M 505 480 Q 540 462 568 481 L 574 497 Q 538 482 504 496 Z",
  "#234e5b",
  "#00000000",
  0,
  0.4,
  irisR,
);
for (let i = 0; i < 13; i++) {
  const a = (i / 12) * Math.PI;
  const x1 = 539 + 19 * Math.cos(a),
    y1 = 511 + 22 * Math.sin(a),
    x2 = 539 + 28 * Math.cos(a),
    y2 = 511 + 37 * Math.sin(a);
  line(
    `M ${String(x1)} ${String(y1)} Q ${String((x1 + x2) / 2 + 1)} ${String((y1 + y2) / 2)} ${String(x2)} ${String(y2)}`,
    i % 2 ? "#b1eee0" : "#2e8390",
    1,
    0.3,
    irisR,
  );
}
oval(517, 486, 7, 5, "#fbfff5", 0.95);
oval(519, 482, 3, 3.5, "#ffffff", 0.9);
oval(561, 521, 3, 3.5, "#b2efdd", 0.65);
line("M 528 548 Q 545 554 556 547", "#a5ead9", 1.7, 0.6);
shape(
  "M 485 504 C 495 482 512 464 535 458 C 565 449 581 458 594 474 L 596 463 L 602 479 L 609 477 L 609 484 L 618 486 L 614 490 L 617 491 L 617 503 C 611 512 607 521 599 526 L 605 503 C 589 481 569 467 544 469 C 519 470 502 484 490 510 Z",
  "#252b30",
  "#00000000",
  0,
);
layer += 1;
line("M 566 550 Q 585 542 594 531", "#9d8c86", 1.5, 0.5);
line("M 494 476 C 517 449 549 443 575 452", "#b38886", 1.8, 0.35);
group = "face-details";
line("M 272 404 C 296 392 327 392 351 400", "#5d9395", 4, 0.8);
line("M 468 401 C 496 383 530 381 561 389 L 580 397", "#558f92", 3.4, 0.8);
line("M 396 650 Q 406 656 423 658", "#b49c92", 1.9, 0.75);
line("M 441 659 Q 458 656 469 649", "#a8958d", 1.9, 0.75);
oval(432, 663, 22, 4, radial(432, 663, 24, ["#f3c2b550", "#f3c2b500"]), 0.6);
line("M 398 648 L 397 652 M 469 647 L 469 650", "#ac968f", 1.4, 0.6);
line("M 425 673 Q 436 675 445 671", "#fff5e8", 1.7, 0.7);
group = "headset";
shape(
  "M 153 423 C 136 418 130 449 135 498 C 138 548 146 581 162 595 L 186 587 L 194 459 Z",
  linear(140, 460, 190, 486, ["#242a32", "#3b4650", "#25353e"]),
  "#253f48",
  2.5,
);
shape(
  "M 686 413 C 710 423 724 458 716 512 C 712 551 696 576 670 590 L 649 573 L 649 461 Z",
  linear(664, 443, 713, 491, ["#34434a", "#343740", "#463b47", "#233840"]),
  "#263c44",
  2.2,
);
shape("M 702 451 Q 717 495 698 544 L 687 558 Q 708 509 697 469 Z", "#755261", "#00000000", 0, 0.45);
line("M 707 463 Q 715 505 698 540", "#9a6379", 1.2, 0.35);
shape("M 232 582 Q 246 602 264 621 L 273 638 Q 251 644 237 630 Z", "#293741", "#1f343e", 1.5);
line("M 254 635 C 264 678 285 708 318 713", "#2e3b43", 7);
line("M 255 637 C 267 677 289 704 314 708", "#64717a", 2, 0.6);
oval(322, 717, 15, 11, linear(311, 707, 331, 728, ["#505861", "#303a45"]));
oval(319, 713, 8, 4, "#6d7277", 0.5);
group = "bangs";
const fringeLeft =
  "M 426 66 C 384 47 304 79 244 127 C 187 172 161 237 150 313 C 132 418 133 547 162 641 C 183 700 220 742 298 770 C 246 729 215 670 210 590 C 204 520 215 459 238 397 C 245 420 239 450 235 476 C 268 422 311 345 338 287 C 335 378 356 458 410 517 C 386 472 372 420 369 374 C 387 452 427 513 482 541 C 457 493 450 438 452 379 C 453 345 454 318 457 295 C 475 350 513 401 565 447 C 585 466 598 476 614 484 C 597 455 587 430 581 403 C 618 464 620 538 608 604 C 603 646 586 676 565 697 C 580 687 590 675 600 661 C 591 698 571 728 552 756 C 608 724 655 663 678 597 C 702 526 702 434 685 349 C 666 245 632 166 574 117 C 531 80 467 51 426 66 Z";
shape(
  fringeLeft,
  linear(174, 202, 679, 568, ["#7cc7c9", "#79c5c8", "#71bdc3", "#68b5bd"]),
  "#42737a",
  2.2,
);
// Crown highlights and the small central part.
shape(
  "M 204 205 C 255 127 349 74 417 79 Q 385 76 379 94 C 319 100 253 146 204 205 Z",
  "#a0d9d6",
  "#00000000",
  0,
  0.28,
  fringeLeft,
);
shape(
  "M 433 85 C 482 62 551 92 601 145 C 557 111 486 82 433 99 Z",
  "#a8ddd7",
  "#00000000",
  0,
  0.25,
  fringeLeft,
);
line("M 206 218 C 245 151 329 102 375 99 Q 389 99 399 106", "#4d9aa3", 2.7, 0.4);
line("M 421 103 C 450 83 500 90 540 111 Q 592 139 627 188", "#4d98a1", 2.3, 0.45);
shape(
  "M 236 238 C 270 173 318 133 358 122 C 374 117 382 124 381 131 C 333 146 279 190 236 238 Z",
  "#4498a3",
  "#00000000",
  0,
  0.75,
);
shape(
  "M 437 124 C 453 112 480 124 500 140 C 552 181 589 255 606 322 C 575 241 527 175 476 143 Z",
  "#42939f",
  "#00000000",
  0,
  0.7,
);
// Broad internal lock shadows taper toward their tips.
shape(
  "M 338 287 C 331 349 320 392 296 429 C 312 390 322 346 326 306 C 285 388 253 432 235 476 C 243 436 273 356 309 297 C 331 260 349 209 367 162 C 354 214 343 255 338 287 Z",
  linear(300, 261, 325, 446, ["#67b4bd", "#4397a3", "#5daab4"]),
  "#00000000",
  0,
  0.75,
  fringeLeft,
);
shape(
  "M 234 355 C 210 443 199 543 215 625 C 226 689 258 739 298 770 C 243 749 207 701 186 650 C 166 598 159 554 163 495 C 168 580 187 640 219 682 C 200 605 204 528 214 456 Z",
  "#3d8c98",
  "#00000000",
  0,
  0.65,
  fringeLeft,
);
shape(
  "M 369 374 C 373 435 388 480 410 517 C 378 488 357 446 348 405 C 342 379 340 340 343 317 C 350 366 355 399 369 427 Z",
  "#4a9ea9",
  "#00000000",
  0,
  0.6,
  fringeLeft,
);
shape(
  "M 452 279 C 444 349 445 441 465 501 L 482 541 C 447 519 422 489 403 460 C 434 484 440 490 450 493 C 435 435 434 346 441 285 Z",
  "#4fa2ad",
  "#00000000",
  0,
  0.6,
  fringeLeft,
);
shape(
  "M 488 291 C 517 374 544 412 585 446 L 614 484 Q 580 469 550 436 C 522 402 502 356 488 291 Z",
  "#499ba5",
  "#00000000",
  0,
  0.4,
  fringeLeft,
);
shape(
  "M 579 270 C 599 320 615 385 620 430 C 641 504 632 593 600 661 C 609 618 611 584 610 558 C 626 455 601 349 579 270 Z",
  "#4897a2",
  "#00000000",
  0,
  0.52,
  fringeLeft,
);
shape(
  "M 678 408 C 701 528 676 653 601 711 Q 572 739 552 756 C 610 681 657 569 658 464 Z",
  "#458e9b",
  "#00000000",
  0,
  0.7,
  fringeLeft,
);
shape(
  "M 655 450 C 667 556 627 651 588 698 C 630 669 659 622 674 565 Q 690 504 682 466 Z",
  "#5cacb5",
  "#00000000",
  0,
  0.6,
  fringeLeft,
);
// Soft, long specular ribbons avoid the flat sticker look.
shape(
  "M 288 229 C 252 304 227 384 220 477 C 225 411 247 357 274 315 Q 299 269 327 206 C 314 215 302 223 288 229 Z",
  linear(250, 231, 251, 475, ["#a4dcd7b0", "#8ed1ce90", "#94d7d200"]),
  "#00000000",
  0,
  0.7,
  fringeLeft,
);
shape(
  "M 360 191 C 351 253 350 300 356 345 Q 360 369 366 391 C 360 310 372 251 379 186 Z",
  linear(360, 187, 361, 391, ["#a4ddd780", "#a0ddd680", "#8bd2d000"]),
  "#00000000",
  0,
  0.8,
  fringeLeft,
);
shape(
  "M 392 150 C 403 209 405 285 411 345 C 414 377 423 402 431 420 C 418 324 425 223 404 162 Z",
  linear(401, 156, 415, 418, ["#92d1d040", "#a2ded780", "#88d0cd00"]),
  "#00000000",
  0,
  0.6,
  fringeLeft,
);
shape(
  "M 490 180 C 537 234 563 298 578 347 C 566 270 532 207 490 180 Z",
  "#a8ded580",
  "#00000000",
  0,
  0.48,
  fringeLeft,
);
shape(
  "M 633 304 C 662 393 666 468 650 547 C 676 472 666 375 648 332 Z",
  linear(642, 306, 657, 548, ["#a9ddd540", "#9ad8d580", "#8bcecc00"]),
  "#00000000",
  0,
  0.6,
  fringeLeft,
);
// Fine strands are grouped so their whole region can be adjusted together.
group = "hair-strands";
for (const [d, w, o] of [
  ["M 356 150 C 301 217 261 291 244 375", 1.2, 0.32],
  ["M 342 180 C 299 256 273 322 261 375", 0.9, 0.25],
  ["M 330 245 C 300 320 270 387 249 425", 1.2, 0.26],
  ["M 374 147 C 350 215 335 277 340 345", 1.1, 0.32],
  ["M 382 174 C 371 247 370 306 376 358", 1.1, 0.25],
  ["M 396 139 C 411 217 411 311 418 365", 1, 0.23],
  ["M 424 157 C 438 240 437 314 441 366", 1.1, 0.28],
  ["M 452 154 C 467 195 478 249 488 290", 1.2, 0.27],
  ["M 483 155 C 521 192 550 244 568 292", 1.2, 0.25],
  ["M 506 159 C 557 214 590 290 601 350", 1, 0.24],
  ["M 570 187 C 616 257 638 339 643 407", 1, 0.25],
  ["M 626 279 C 645 340 650 401 647 451", 0.9, 0.28],
  ["M 164 435 C 153 559 187 668 235 715", 1.4, 0.35],
  ["M 179 491 C 178 577 192 633 215 673", 1.1, 0.3],
  ["M 227 466 C 208 537 215 606 236 647", 1, 0.22],
  ["M 669 443 C 678 530 650 612 615 665", 1.2, 0.3],
  ["M 651 544 C 638 607 615 652 588 685", 1, 0.3],
] as const)
  line(d, "#347f8c", w, o, fringeLeft);
for (let i = 0; i < 12; i++) {
  const x = 376 + i * 7;
  line(
    `M ${String(x)} ${String(163 + i * 2)} C ${String(x + 6)} 225 ${String(x - 3)} 280 ${String(x + 7)} ${String(340 + i * 6)}`,
    "#c0e8df",
    0.7,
    0.12,
    fringeLeft,
  );
}
// Flying side locks and lower tips.
shape(
  "M 160 351 C 136 414 119 494 108 594 C 91 576 99 510 113 457 C 128 403 147 370 160 351 Z",
  "#54a2ad",
  "#4d98a2",
  1,
  0.65,
);
line("M 152 382 C 126 456 115 520 111 575", "#316d7c", 1.6, 0.4);
shape(
  "M 686 348 C 714 393 730 443 742 500 C 725 477 716 452 705 425 Z",
  "#66b0b9",
  "#4b8d98",
  1,
  0.8,
);
line("M 708 418 Q 735 464 741 503", "#3e8491", 1.4, 0.5);
shape("M 537 699 L 556 730 Q 537 720 530 709 Z", "#4c9eaa", "#518f99", 1);
group = "hair-ornaments";
// Red inset panels with bevels, matching the reference's long rectangular clips.
shape(
  "M 105 246 L 192 57 L 243 61 L 254 115 L 164 290 L 133 368 L 118 324 Z",
  linear(123, 195, 219, 211, ["#25363f", "#3c4850", "#293a43"]),
  "#253f46",
  2.6,
);
shape(
  "M 114 246 L 198 66 L 221 68 L 140 253 Z",
  linear(118, 239, 215, 84, ["#d83b77", "#ef478a", "#e44986"]),
  "#803350",
  1.2,
);
shape("M 140 253 L 221 68 L 239 66 L 157 260 Z", "#41464c", "#00000000", 0);
shape("M 119 256 L 135 263 L 145 321 L 135 348 Z", "#c1346c", "#702f4c", 1.1);
shape("M 145 266 L 155 272 L 151 316 L 145 332 Z", "#202d36", "#00000000", 0);
line("M 199 61 L 239 64 L 245 102", "#5d666b", 1.5, 0.8);
line("M 122 244 L 201 73", "#ff80a5", 1.8, 0.4);
shape(
  "M 616 67 L 664 60 L 750 246 L 741 322 L 722 376 L 701 345 L 694 276 L 609 120 Z",
  linear(625, 171, 734, 191, ["#263640", "#42474e", "#2a3841"]),
  "#29404a",
  2.5,
);
shape(
  "M 639 67 L 658 65 L 738 247 L 721 253 Z",
  linear(653, 80, 733, 246, ["#e64482", "#ec4689", "#d73677"]),
  "#87344f",
  1.1,
);
shape(
  "M 720 257 L 736 250 L 727 326 L 718 357 L 709 341 Z",
  linear(716, 269, 727, 340, ["#c12c69", "#a3265d", "#c43370"]),
  "#662b49",
  1.1,
);
shape("M 615 74 L 630 76 L 710 251 L 704 278 L 613 117 Z", "#465059", "#263b46", 1);
line("M 646 72 L 723 240", "#f877a4", 1.8, 0.35);
line("M 620 70 L 659 63", "#788086", 1.3, 0.65);

export const mikuStudyDocument: PaintDocument = {
  version: 3,
  canvas: { width: 900, height: 1080, background: "#ffffff" },
  phase: "reflection",
  shapes,
};

if (import.meta.main) {
  const output = "out/miku-study";
  await mkdir(output, { recursive: true });
  const doc = parsePaintDocument(mikuStudyDocument);
  await Bun.write(`${output}/document.json`, `${JSON.stringify(doc, null, 2)}\n`);
  await Bun.write(`${output}/miku-study.png`, renderDocumentToPng(doc));
  await Bun.write(`${output}/miku-study.svg`, renderDocumentToSvg(doc));
  const liveIndex = process.argv.indexOf("--live");
  if (liveIndex >= 0) {
    const address = process.argv[liveIndex + 1] ?? "http://localhost:8901";
    const request = async (path: string, method: string, body: unknown): Promise<void> => {
      const response = await fetch(`${address}${path}`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await response.text());
    };
    await request("/document", "PUT", { ...doc, phase: "base", shapes: [] });
    for (let i = 0; i < doc.shapes.length; i += 3) {
      await request("/shapes", "POST", { shapes: doc.shapes.slice(i, i + 3) });
      await Bun.sleep(650);
    }
    await request("/phase", "POST", { phase: "reflection" });
  }
  console.log(`描画しました: ${output}/miku-study.png（${String(shapes.length)}図形）`);
}
