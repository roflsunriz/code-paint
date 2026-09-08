import { mkdir } from "node:fs/promises";
import type { PaintDocument, PaintFill, PaintShape } from "../src/paint-document.ts";
import { parsePaintDocument } from "../src/validate-document.ts";
import { renderDocumentToPng } from "../src/render-document.ts";
import { renderDocumentToSvg } from "../src/render-svg.ts";

const shapes: PaintShape[] = [];
type Matrix = [number, number, number, number, number, number];
let layer = 0,
  group = "garden",
  transform: Matrix | undefined;
const ink = "#79534f";
const grad = (x1: number, y1: number, x2: number, y2: number, colors: string[]): PaintFill => ({
  kind: "linear",
  x1,
  y1,
  x2,
  y2,
  stops: colors.map((color, i) => ({ offset: i / (colors.length - 1), color })),
});
const glow = (cx: number, cy: number, r: number, colors: string[]): PaintFill => ({
  kind: "radial",
  cx,
  cy,
  r,
  stops: colors.map((color, i) => ({ offset: i / (colors.length - 1), color })),
});
function rotation(degrees: number, cx: number, cy: number): Matrix {
  const t = (degrees * Math.PI) / 180,
    a = Math.cos(t),
    b = Math.sin(t);
  return [a, b, -b, a, cx - a * cx + b * cy, cy - b * cx - a * cy];
}
function p(d: string, fill?: PaintFill, stroke = ink, w = 4, opacity = 1, clip?: string): void {
  layer++;
  shapes.push({
    id: `${group}-${String(layer)}`,
    group,
    layer,
    kind: "curve",
    phase: group === "garden" ? "background" : fill ? "base" : "lineart",
    d,
    stroke,
    strokeWidth: w,
    opacity,
    ...(fill ? { fill } : {}),
    ...(clip ? { clip } : {}),
    ...(transform ? { transform } : {}),
  });
}
function oval(
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: PaintFill,
  stroke = "#00000000",
  w = 0,
  opacity = 1,
  clip?: string,
): void {
  const k = 0.55228475;
  p(
    `M ${String(x - rx)} ${String(y)} C ${String(x - rx)} ${String(y - ry * k)} ${String(x - rx * k)} ${String(y - ry)} ${String(x)} ${String(y - ry)} C ${String(x + rx * k)} ${String(y - ry)} ${String(x + rx)} ${String(y - ry * k)} ${String(x + rx)} ${String(y)} C ${String(x + rx)} ${String(y + ry * k)} ${String(x + rx * k)} ${String(y + ry)} ${String(x)} ${String(y + ry)} C ${String(x - rx * k)} ${String(y + ry)} ${String(x - rx)} ${String(y + ry * k)} ${String(x - rx)} ${String(y)} Z`,
    fill,
    stroke,
    w,
    opacity,
    clip,
  );
}
function leaf(x: number, y: number, size: number, angle: number, color: string): void {
  const old = transform;
  transform = rotation(angle, x, y);
  p(
    `M ${String(x)} ${String(y)} Q ${String(x - size * 0.8)} ${String(y - size * 0.7)} ${String(x)} ${String(y - size * 1.8)} Q ${String(x + size * 0.8)} ${String(y - size * 0.7)} ${String(x)} ${String(y)} Z`,
    color,
    "#00000000",
    0,
  );
  p(
    `M ${String(x)} ${String(y)} L ${String(x)} ${String(y - size * 1.45)}`,
    undefined,
    "#ffffff",
    1,
    0.2,
  );
  transform = old;
}
function flower(x: number, y: number, r: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    oval(
      x + Math.cos(a) * r * 0.62,
      y + Math.sin(a) * r * 0.62,
      r * 0.48,
      r * 0.5,
      "#fff9dc",
      "#d3b877",
      1.3,
    );
  }
  oval(x, y, r * 0.3, r * 0.3, "#e8bc59");
  oval(x - 2, y - 2, r * 0.12, r * 0.12, "#fff1a6");
}
// A sunlit clearing, drawn in muted colours so Butter remains the focus.
p(
  "M 0 0 L 1280 0 L 1280 1280 L 0 1280 Z",
  grad(0, 0, 1000, 1280, ["#d3e6ce", "#fff3c7", "#fff5dd"]),
  "#00000000",
  0,
);
oval(661, 553, 650, 650, glow(661, 480, 640, ["#fffbe7", "#fff4cda0", "#ffec9900"]));
p(
  "M 118 0 C 151 194 129 296 99 422 C 89 502 100 638 63 774 L 0 814 L 0 0 Z",
  grad(0, 0, 151, 485, ["#8fafa0", "#b5c5a3", "#d9d8ab"]),
  "#00000000",
  0,
  0.65,
);
p(
  "M 1131 0 C 1067 212 1154 360 1119 603 L 1080 838 L 1280 855 L 1280 0 Z",
  grad(1110, 400, 1280, 444, ["#b3c7a2", "#789e91", "#92b3a0"]),
  "#00000000",
  0,
  0.62,
);
p("M 1211 306 Q 1074 176 991 179 M 91 289 Q 180 182 273 161", undefined, "#91ad92", 29, 0.35);
for (let i = 0; i < 25; i++) {
  const x = (i * 173 + 51) % 1320,
    y = (i * 67) % 165;
  oval(
    x,
    y,
    56 + (i % 4) * 17,
    42 + (i % 3) * 12,
    i % 2 ? "#9cbea0" : "#c7d8a5",
    "#00000000",
    0,
    0.35,
  );
}
p(
  "M 0 922 Q 181 844 362 931 Q 729 1021 976 912 Q 1140 858 1280 923 L 1280 1280 L 0 1280 Z",
  grad(0, 887, 0, 1280, ["#d4dfb3", "#ecedc9", "#fff4dc"]),
  "#00000000",
  0,
);
p(
  "M 0 1069 Q 272 994 523 1076 Q 824 1162 1280 1018 L 1280 1280 L 0 1280 Z",
  "#f7efd0",
  "#00000000",
  0,
);
p(
  "M 984 864 C 915 1000 1091 1105 1227 1218 L 902 1280 C 793 1157 830 1019 908 904 Z",
  grad(859, 949, 1100, 1239, ["#f7e4ba", "#fff3d6", "#f8e8c7"]),
  "#00000000",
  0,
  0.72,
);
for (let i = 0; i < 26; i++) {
  const side = i % 2 === 0;
  const x = side ? 50 + ((i * 47) % 190) : 1030 + ((i * 31) % 240);
  const y = 790 + ((i * 29) % 380);
  leaf(
    x,
    y,
    24 + (i % 5) * 5,
    side ? -35 + (i % 5) * 15 : 25 - (i % 4) * 20,
    i % 3 ? "#a5c7a0" : "#c4d8a6",
  );
}
for (const [x, y, r] of [
  [145, 972, 17],
  [1036, 997, 18],
  [1144, 1098, 22],
  [270, 1123, 15],
  [85, 1170, 19],
  [948, 1185, 13],
] as const)
  flower(x, y, r);
for (let i = 0; i < 38; i++) {
  const x = 70 + ((i * 197) % 1150),
    y = 85 + ((i * 137) % 1070);
  oval(x, y, 2 + (i % 3), 2 + (i % 3), i % 2 ? "#ffffff" : "#fff6ba", "#00000000", 0, 0.55);
}
// A small hollow tree house in the distance.
p(
  "M 88 684 Q 113 578 169 571 Q 223 581 241 680 L 240 861 L 100 865 Z",
  "#c2cba0",
  "#acba93",
  3,
  0.7,
);
p("M 71 671 Q 161 530 252 670 Q 182 695 71 671 Z", "#c5b779", "#b0a26d", 3, 0.7);
p("M 140 855 L 138 754 Q 166 704 194 754 L 194 855 Z", "#a7b88c", "#91a580", 2);
oval(166, 661, 25, 25, "#f7df92", "#a1aa7c", 4);
p("M 142 661 L 190 661 M 166 637 L 166 685", undefined, "#a1aa7c", 3);
oval(184, 792, 3, 3, "#ebd998");
oval(624, 1151, 198, 31, glow(624, 1151, 205, ["#bca77890", "#cdbb8330", "#ddcb9b00"]));
// Soft motion arcs behind the leap.
p("M 304 1009 C 211 882 238 764 277 725", undefined, "#ffffff", 7, 0.8);
p("M 284 1034 Q 223 975 217 933", undefined, "#dec899", 3, 0.8);
layer = 1000;
group = "tail";
p(
  "M 710 844 C 770 811 823 821 875 859 Q 924 891 949 905 L 926 914 L 979 944 Q 958 962 931 957 L 949 970 C 891 991 814 958 773 925 Q 728 899 710 844 Z",
  grad(753, 832, 907, 963, ["#e7ceb0", "#e5cbb2", "#cfa999"]),
  ink,
  5,
);
p(
  "M 754 883 Q 824 907 868 940 L 849 922 Q 897 947 932 953 L 949 970 C 891 991 814 958 773 925 Z",
  "#b99289",
  "#00000000",
  0,
  0.45,
);
p(
  "M 790 846 Q 835 855 864 881 L 851 880 L 897 910 Q 835 890 790 846 Z",
  "#f8e2bd",
  "#00000000",
  0,
  0.75,
);
p("M 857 949 L 839 935 M 907 960 L 887 948", undefined, "#ad827c", 2, 0.55);
group = "hair-back";
transform = rotation(-7, 620, 440);
const back =
  "M 413 254 C 473 198 715 176 792 258 C 839 319 848 423 848 504 C 844 618 886 727 921 783 C 938 816 919 842 893 848 L 910 824 Q 879 852 849 836 Q 816 864 794 849 C 738 807 747 733 707 692 L 500 666 C 480 750 455 813 404 827 L 409 800 Q 388 823 365 810 C 392 765 389 693 389 642 C 375 535 368 340 413 254 Z";
p(back, grad(409, 323, 848, 746, ["#e5cdb5", "#dbbba9", "#caa19a"]), ink, 5);
p(
  "M 774 303 C 813 454 786 576 830 718 Q 860 801 893 822 Q 864 842 849 836 Q 816 864 794 849 C 738 807 747 733 707 692 L 737 519 Z",
  "#b9918d",
  "#00000000",
  0,
  0.65,
  back,
);
p("M 419 460 C 441 590 414 741 389 794 Q 406 728 394 655 Z", "#b18b86", "#00000000", 0, 0.5, back);
p(
  "M 790 385 C 784 560 823 719 869 789 C 827 767 793 701 776 627 C 758 526 770 441 790 385 Z",
  "#f0d8ba",
  "#00000000",
  0,
  0.65,
  back,
);
p("M 440 507 C 466 640 436 757 404 805 Q 454 703 425 588 Z", "#f2d8b8", "#00000000", 0, 0.6, back);
p("M 802 547 C 812 660 842 758 886 807 M 422 647 Q 425 737 399 782", undefined, "#a57c78", 2, 0.5);
transform = undefined;
group = "legs-left";
transform = rotation(11, 552, 896);
p(
  "M 510 847 L 591 854 L 589 934 L 511 935 Z",
  grad(513, 864, 574, 940, ["#fff0e7", "#f4d5cf"]),
  ink,
  4.5,
);
const sockL =
  "M 508 914 Q 520 905 534 917 Q 545 902 559 916 Q 573 903 590 914 L 590 1067 Q 589 1093 565 1098 L 530 1097 Q 511 1093 510 1074 Z";
p(sockL, grad(509, 930, 590, 986, ["#8c6966", "#a17b72", "#78575b"]), ink, 5);
for (let i = 0; i < 6; i++) {
  const y = 930 + i * 28;
  p(
    `M 495 ${String(y)} Q 550 ${String(y + 8)} 603 ${String(y - 2)} L 603 ${String(y + 15)} Q 550 ${String(y + 25)} 495 ${String(y + 18)} Z`,
    grad(511, y, 586, y, ["#f2d893", "#ffe7a6", "#e0bc7c"]),
    "#00000000",
    0,
    1,
    sockL,
  );
}
p(
  "M 512 1054 Q 552 1068 589 1058 L 591 1080 Q 586 1104 559 1107 L 533 1105 Q 513 1103 511 1085 Z",
  "#edc5c0",
  ink,
  4.5,
);
p("M 519 1086 Q 551 1097 580 1088", undefined, "#c19594", 3);
p("M 519 934 L 520 1038", undefined, "#fff2bc", 3, 0.25);
group = "legs-kick";
transform = rotation(-48, 665, 882);
p(
  "M 623 835 L 708 839 L 708 910 L 625 916 Z",
  grad(623, 848, 706, 916, ["#fff0e7", "#f0cfc8"]),
  ink,
  4.5,
);
const sockR =
  "M 622 895 Q 638 884 649 898 Q 663 884 676 897 Q 693 884 708 897 L 710 1057 Q 706 1080 684 1085 L 649 1085 Q 626 1080 625 1060 Z";
p(sockR, grad(623, 918, 710, 982, ["#95706a", "#a47d73", "#7e5c60"]), ink, 5);
for (let i = 0; i < 6; i++) {
  const y = 909 + i * 28;
  p(
    `M 614 ${String(y)} Q 665 ${String(y + 8)} 721 ${String(y)} L 720 ${String(y + 16)} Q 663 ${String(y + 24)} 614 ${String(y + 17)} Z`,
    grad(625, y, 708, y, ["#f2d893", "#ffe7a6", "#dfba7d"]),
    "#00000000",
    0,
    1,
    sockR,
  );
}
p(
  "M 625 1046 Q 667 1058 710 1047 L 711 1071 Q 704 1093 678 1095 L 650 1093 Q 627 1090 625 1075 Z",
  "#edc5c0",
  ink,
  4.5,
);
p("M 635 1075 Q 666 1086 700 1077", undefined, "#be9090", 3);
transform = undefined;
group = "shorts";
p(
  "M 505 805 L 684 802 L 720 856 L 654 910 L 603 876 L 593 912 L 501 889 L 484 865 Z",
  grad(536, 815, 600, 907, ["#ffe7dc", "#f2c9c6", "#e7baba"]),
  ink,
  5,
);
p("M 598 835 L 603 876 M 503 877 L 585 897 M 659 896 L 707 857", undefined, "#ba8b88", 3);
group = "arms";
// White short sleeves and compact, rounded hands preserve the chibi proportions.
p("M 522 677 C 485 672 465 705 446 722 L 476 773 Q 514 765 543 735 Z", "#fff8ed", ink, 4.5);
p(
  "M 447 727 C 420 742 397 750 369 750 L 362 781 Q 425 798 477 762 Z",
  grad(385, 746, 463, 782, ["#fff3e8", "#f7d9d0"]),
  ink,
  4.5,
);
p("M 451 730 L 472 763 M 501 691 L 482 728", undefined, "#c1a19a", 2.5);
p("M 690 680 C 737 651 774 619 810 587 L 849 625 Q 795 689 722 718 Z", "#fff8f0", ink, 4.5);
p(
  "M 810 595 C 836 567 855 536 865 508 L 904 526 C 891 576 879 611 849 642 L 830 647 Z",
  grad(834, 565, 877, 609, ["#fff1e7", "#f7d8ce"]),
  ink,
  4.5,
);
p("M 806 599 L 835 632 M 727 678 Q 754 669 771 650", undefined, "#c4a7a0", 2.5);
p(
  "M 867 517 Q 858 493 866 481 Q 873 475 880 486 L 880 468 Q 884 457 894 465 L 899 478 Q 901 461 910 467 Q 916 470 915 486 Q 928 480 931 493 L 932 512 C 927 536 900 546 882 536 Z",
  "#fff0e8",
  ink,
  4.5,
);
p("M 893 478 L 894 491 M 915 486 L 915 498 M 878 509 Q 888 509 893 519", undefined, "#c59994", 2.4);
group = "dress";
const dress =
  "M 543 660 Q 583 644 625 650 L 683 670 C 692 714 680 753 689 787 Q 700 817 720 840 C 670 877 556 881 484 846 Q 508 815 522 782 C 535 743 529 695 543 660 Z";
p(dress, grad(530, 674, 649, 865, ["#ffe9b1", "#f7d68e", "#efc57d"]), ink, 5);
p(
  "M 648 680 Q 630 730 650 780 Q 666 824 697 849 L 720 840 Q 689 809 689 787 Q 680 753 683 699 Z",
  "#cfa56f",
  "#00000000",
  0,
  0.42,
  dress,
);
p(
  "M 541 718 Q 558 751 550 785 L 511 838 Q 528 799 530 765 Z",
  "#fff2c2",
  "#00000000",
  0,
  0.75,
  dress,
);
p("M 492 839 Q 606 886 710 835", undefined, "#9a7053", 7);
p("M 494 831 Q 606 873 706 827", undefined, "#ffeab1", 4);
p(
  "M 530 697 Q 556 676 579 704 Q 600 676 629 686 L 621 720 C 614 753 573 753 573 727 Q 550 747 535 730 Z",
  "#fff0bf",
  ink,
  3.5,
);
p("M 536 699 Q 551 693 562 705 M 587 697 L 608 698 M 588 711 L 604 712", undefined, "#cdab77", 2.2);
p(
  "M 524 779 Q 568 761 618 785 L 612 808 Q 600 840 558 837 Q 521 831 524 801 Z",
  "#ffdfa0",
  ink,
  3.5,
);
p("M 532 785 Q 570 774 608 791", undefined, "#fff4ce", 3);
p("M 513 765 Q 601 742 684 777", undefined, "#946b59", 9);
p("M 513 762 Q 601 740 684 774", undefined, "#ba9272", 3);
group = "neck-bell";
p("M 566 610 L 650 610 L 665 677 Q 617 711 561 676 Z", "#fff0e5", ink, 4);
p("M 557 650 L 605 685 L 570 704 L 544 672 Z", "#fffaf3", ink, 3.5);
p("M 656 646 L 605 685 L 644 701 L 679 667 Z", "#fffaf3", ink, 3.5);
p("M 573 644 Q 614 667 651 641 L 654 658 Q 612 681 570 661 Z", "#8f6460", ink, 3);
oval(612, 666, 21, 23, grad(592, 647, 632, 681, ["#fff0b3", "#edb95c"]), ink, 4);
oval(607, 659, 5, 5, "#fff7cc");
p("M 614 662 L 614 673", undefined, "#80554c", 4);
oval(614, 678, 4, 3, "#80554c");
group = "face";
transform = rotation(-7, 620, 440);
const face =
  "M 418 389 C 441 331 485 310 559 305 C 644 298 735 321 772 373 C 795 408 808 504 802 553 C 797 597 771 626 730 642 C 675 663 510 667 458 638 C 421 620 401 595 400 556 C 398 505 401 440 418 389 Z";
p(face, grad(598, 342, 598, 650, ["#f6d8d0", "#fff0ea", "#fff0ea"]), ink, 5);
oval(
  603,
  556,
  180,
  100,
  glow(603, 556, 190, ["#fff6ef80", "#fff6ef00"]),
  "#00000000",
  0,
  0.7,
  face,
);
p(
  "M 408 485 Q 411 592 462 622 Q 508 649 587 652 C 478 658 412 636 402 583 Z",
  "#e5b7b3",
  "#00000000",
  0,
  0.32,
  face,
);
oval(450, 565, 54, 41, "#ffa5aa", "#00000000", 0, 0.9, face);
oval(751, 558, 53, 41, "#ffa5aa", "#00000000", 0, 0.9, face);
for (const x of [420, 439, 458])
  p(`M ${String(x)} 566 L ${String(x + 9)} 555`, undefined, "#ee828e", 4, 0.6, face);
for (const x of [726, 745, 764])
  p(`M ${String(x)} 560 L ${String(x + 9)} 549`, undefined, "#ee828e", 4, 0.6, face);
group = "eyes";
// Lavender upper irises and pale cyan lower halves are distinctive in the references.
const eyeL =
  "M 473 480 C 476 453 495 437 516 440 C 539 441 551 461 550 490 C 549 519 536 538 512 539 C 489 537 475 518 473 480 Z";
const eyeR =
  "M 652 474 C 655 444 674 430 696 432 C 719 434 734 456 732 483 C 730 512 716 530 692 529 C 668 528 654 506 652 474 Z";
p(eyeL, grad(509, 440, 509, 538, ["#957991", "#987d9b", "#93d5df", "#b2e9e9"]), ink, 4.2);
p(eyeR, grad(691, 433, 691, 529, ["#957991", "#987d9b", "#93d5df", "#b2e9e9"]), ink, 4.2);
p("M 471 495 Q 513 483 552 500 L 552 549 L 473 549 Z", "#9bdae2", "#00000000", 0, 1, eyeL);
p("M 651 487 Q 691 476 734 492 L 734 540 L 652 540 Z", "#9bdae2", "#00000000", 0, 1, eyeR);
oval(532, 475, 12, 14, "#fffdfa");
oval(714, 468, 12, 14, "#fffdfa");
oval(500, 522, 7, 4, "#daf5ee", "#00000000", 0, 0.65);
oval(678, 512, 7, 4, "#daf5ee", "#00000000", 0, 0.65);
p(
  "M 466 480 C 467 461 474 447 482 441 L 480 433 L 489 437 C 498 430 509 430 519 434 C 537 438 550 450 554 467 L 550 479 C 544 456 531 444 515 444 C 494 441 480 456 478 480 L 474 490 Z",
  "#805654",
  "#00000000",
  0,
);
p(
  "M 646 473 C 646 449 662 428 682 425 C 697 421 708 427 717 433 L 722 423 L 726 438 L 735 437 L 732 445 L 737 457 L 733 468 C 723 446 710 435 696 436 C 675 434 661 451 659 475 L 653 485 Z",
  "#805654",
  "#00000000",
  0,
);
// Lash flicks share the eyelid contour; keep later live-edit IDs stable.
layer += 2;
p("M 479 414 Q 497 398 525 410", undefined, "#8c635d", 8);
p("M 663 401 Q 685 385 713 398", undefined, "#8c635d", 8);
group = "smile";
p(
  "M 576 567 Q 587 551 600 562 Q 618 547 633 558 C 636 581 626 606 609 614 C 592 612 580 592 576 567 Z",
  grad(599, 558, 608, 612, ["#a65663", "#d67580", "#eb9296"]),
  ink,
  4.5,
);
p("M 589 589 Q 608 578 625 592 Q 619 608 609 611 Q 596 608 589 589 Z", "#ffa1a5", "#00000000", 0);
p("M 580 565 L 590 561 L 590 576 Q 582 575 580 565 Z", "#fff8ed", ink, 1.6);
p("M 574 562 L 570 554 M 632 558 L 637 550", undefined, ink, 3);
oval(611, 551, 3, 2, "#d8aaa5", "#00000000", 0, 0.3);
group = "hair-front";
const front =
  "M 395 355 C 368 285 414 223 481 206 C 527 185 567 185 601 190 Q 570 165 590 148 Q 611 131 642 145 Q 615 143 615 162 Q 616 177 635 184 C 720 174 789 212 818 283 C 845 349 832 488 800 541 Q 779 566 750 574 C 782 536 775 465 758 421 Q 748 383 724 355 C 741 383 751 401 759 408 Q 723 413 690 393 C 666 404 639 405 615 390 Q 588 405 558 393 Q 534 401 515 385 Q 493 397 478 381 C 457 428 444 469 437 506 Q 416 493 409 466 C 391 494 395 550 414 588 Q 436 620 462 630 C 421 621 387 593 375 552 C 359 478 373 407 385 384 Q 370 390 356 377 Q 385 367 395 355 Z";
p(front, grad(411, 264, 787, 550, ["#e6cdb3", "#dfc1ac", "#dfc2ac", "#d3ae9f"]), ink, 5);
p(
  "M 467 343 Q 482 366 512 353 Q 537 363 557 353 Q 582 365 611 351 Q 643 366 670 348 Q 719 365 759 408 Q 723 413 690 393 C 666 404 639 405 615 390 Q 588 405 558 393 Q 534 401 515 385 Q 493 397 478 381 Z",
  "#ba9290",
  "#00000000",
  0,
  0.8,
  front,
);
p(
  "M 468 261 C 442 302 415 363 410 423 C 407 451 409 478 421 491 L 437 506 C 422 504 416 493 409 466 C 391 494 395 550 414 588 Q 436 620 462 630 C 421 621 387 593 375 552 C 386 592 408 607 425 608 C 393 550 395 498 400 431 C 405 363 422 306 448 273 Z",
  "#c29a8f",
  "#00000000",
  0,
  0.7,
  front,
);
p(
  "M 740 258 C 791 356 810 463 782 536 L 750 574 Q 781 566 800 541 C 832 488 845 349 818 283 Z",
  "#bd958d",
  "#00000000",
  0,
  0.55,
  front,
);
p(
  "M 765 296 C 792 362 801 443 786 480 Q 788 376 748 316 Z",
  "#f4dfbd",
  "#00000000",
  0,
  0.65,
  front,
);
p(
  "M 421 340 Q 448 261 510 234 C 474 273 449 309 436 348 Z",
  "#f4dfc1",
  "#00000000",
  0,
  0.75,
  front,
);
p("M 502 248 Q 540 215 572 217 Q 543 224 528 243 Z", "#f9e6c7", "#00000000", 0, 0.7);
p("M 457 296 Q 501 208 575 210 M 646 209 Q 724 217 761 281", undefined, "#efcb78", 8);
p("M 455 295 Q 502 205 576 207 M 646 206 Q 726 212 766 280", undefined, ink, 2.4);
p(
  "M 495 282 Q 477 328 478 381 M 559 272 C 555 314 554 367 558 393 M 630 276 Q 631 345 690 393 M 723 304 Q 751 342 759 408",
  undefined,
  "#a97e77",
  2.8,
  0.75,
);
p("M 467 362 Q 480 346 497 347 M 615 372 Q 624 383 638 384", undefined, "#956b69", 4, 0.7);
p("M 469 361 Q 480 346 490 349 Q 493 354 480 360 Z", "#bc938b", ink, 2);
group = "ears";
const earL =
  "M 467 219 C 421 199 397 214 370 238 C 340 264 310 271 285 294 C 271 314 287 341 313 342 C 349 337 380 309 411 291 L 467 253 Z";
p(earL, grad(345, 228, 363, 332, ["#eddbc1", "#e5c7af", "#cda597"]), ink, 5);
p(
  "M 299 300 C 320 279 352 280 381 257 Q 401 235 428 233 C 398 262 382 288 357 307 Q 327 334 313 330 Q 298 323 299 300 Z",
  "#cda89b",
  "#00000000",
  0,
  0.6,
);
p("M 299 300 Q 341 271 366 255", undefined, "#f9e7ce", 4, 0.7);
const earR =
  "M 775 222 C 822 207 851 224 874 248 C 904 273 937 273 963 271 Q 978 282 955 306 C 923 342 891 363 860 348 C 821 327 807 289 785 268 Z";
p(earR, grad(812, 226, 921, 344, ["#ecd5bd", "#e4c8ad", "#cda393"]), ink, 5);
p(
  "M 810 250 Q 856 271 868 297 C 883 321 911 327 937 322 Q 894 363 860 348 C 836 332 820 300 810 250 Z",
  "#c5a093",
  "#00000000",
  0,
  0.55,
);
p("M 828 234 Q 855 238 877 259", undefined, "#fae5c9", 4, 0.65);
group = "bows";
// Large central bow and smaller ear bow, each with folded golden fabric.
p(
  "M 565 211 C 535 180 509 186 509 211 L 515 244 Q 527 264 568 231 L 578 220 Z",
  grad(516, 192, 558, 245, ["#ffe9ad", "#f4cd80", "#f8d994"]),
  ink,
  4.5,
);
p(
  "M 586 211 C 618 188 641 186 642 215 Q 642 247 622 250 Q 605 249 582 230 Z",
  grad(600, 195, 630, 245, ["#ffe7a3", "#f2c679"]),
  ink,
  4.5,
);
p("M 568 207 Q 578 202 588 211 L 586 230 Q 575 237 565 228 Z", "#f8d58b", ink, 4);
p("M 552 212 L 565 219 M 589 217 L 610 210", undefined, "#bd925f", 3);
p("M 518 203 Q 519 194 532 200 M 614 200 Q 630 193 633 205", undefined, "#fff1c0", 3);
const bowEar = transform;
transform = rotation(-26, 884, 278);
p("M 878 270 Q 842 249 846 278 L 852 301 Q 861 311 882 289 L 895 283 Z", "#f8d48b", ink, 4);
p("M 893 270 Q 916 248 921 268 L 925 291 Q 919 307 893 288 Z", "#f6ce82", ink, 4);
p("M 881 267 Q 890 263 896 273 L 897 287 L 884 291 Z", "#ffe4a2", ink, 3.5);
p("M 856 266 L 868 277 M 901 275 L 913 268", undefined, "#c29461", 2.5);
transform = bowEar;
transform = undefined;
group = "sling";
// The toy slingshot and its relaxed elastic are carried at her side.
p("M 369 787 L 354 739 C 324 721 302 692 294 653 M 355 740 Q 361 690 346 633", undefined, ink, 22);
p(
  "M 369 787 L 354 739 C 324 721 302 692 294 653 M 355 740 Q 361 690 346 633",
  undefined,
  "#e6b467",
  13,
);
p("M 365 780 L 351 741 Q 313 709 299 666 M 354 726 Q 356 681 348 646", undefined, "#ffe29b", 4);
p("M 290 651 Q 285 644 291 637 L 302 640 L 306 653 Z", "#f6d88e", ink, 3.5);
p("M 336 633 L 335 621 Q 343 611 354 622 L 356 634 Z", "#f6d88e", ink, 3.5);
p("M 295 654 C 292 686 269 697 243 700 Q 264 718 303 699 Q 332 681 344 633", undefined, ink, 7);
p(
  "M 295 654 C 292 686 269 697 243 700 Q 264 718 303 699 Q 332 681 344 633",
  undefined,
  "#ddaf81",
  3,
);
p("M 241 695 Q 229 700 241 711 L 253 711 L 253 700 Z", "#f7d894", ink, 3);
p("M 358 759 L 369 756 M 361 769 L 372 766 M 364 778 L 375 775", undefined, "#fff2cd", 6);
group = "grip";
p(
  "M 352 747 Q 343 735 336 745 Q 330 756 340 768 Q 333 779 345 790 L 365 788 Q 378 779 372 769 Q 365 760 359 764 L 358 754 Z",
  "#fff0e7",
  ink,
  4.5,
);
p("M 342 762 Q 350 767 359 766 M 347 777 Q 355 782 363 777", undefined, "#c69490", 2.2);
group = "bag";
p("M 550 666 C 575 730 625 772 705 825", undefined, ink, 13);
p("M 550 666 C 575 730 625 772 705 825", undefined, "#b58a67", 7);
p("M 552 666 C 577 728 629 773 705 823", undefined, "#edcd91", 2);
oval(705, 824, 9, 9, "#d4a46b", ink, 3);
oval(705, 824, 3, 3, "#ffe7ac");
const bag =
  "M 714 819 C 756 813 788 840 787 883 C 786 921 765 942 731 940 C 696 936 679 911 684 875 C 687 848 695 829 714 819 Z";
p(bag, grad(696, 837, 777, 930, ["#e2bb9c", "#d5a78f", "#c48f83"]), ink, 5);
p(
  "M 695 897 Q 728 936 773 914 Q 759 946 729 938 Q 698 934 690 914 Z",
  "#b7857f",
  "#00000000",
  0,
  0.35,
  bag,
);
p("M 713 823 C 683 816 659 833 655 852 Q 667 870 690 852 Z", "#cda58b", ink, 4);
p("M 744 823 Q 776 812 797 840 Q 806 858 788 861 Q 768 853 752 838 Z", "#97716b", ink, 4);
p("M 726 847 Q 735 835 747 846", undefined, "#b68b7b", 3);
oval(716, 871, 6, 13, "#80544e");
oval(754, 875, 6, 13, "#80544e");
oval(714, 867, 2, 3, "#fff0d5");
oval(752, 871, 2, 3, "#fff0d5");
p("M 728 891 Q 734 885 740 891 L 734 898 Z", "#8c5952", "#00000000", 0);
p("M 734 898 Q 729 910 723 901 M 734 898 Q 741 912 747 902", undefined, "#8c5952", 3);
p("M 701 908 Q 700 917 713 925", undefined, "#f6d7b6", 2.5, 0.65);
// Light foreground accents and a fluttering butterfly underline the joyful motion.
group = "sparkles";
transform = undefined;
layer = 3000;
for (const [x, y, s] of [
  [247, 421, 17],
  [999, 433, 20],
  [978, 721, 12],
  [400, 1000, 13],
] as const)
  p(
    `M ${String(x)} ${String(y - s)} Q ${String(x + 2)} ${String(y - 2)} ${String(x + s)} ${String(y)} Q ${String(x + 2)} ${String(y + 2)} ${String(x)} ${String(y + s)} Q ${String(x - 2)} ${String(y + 2)} ${String(x - s)} ${String(y)} Q ${String(x - 2)} ${String(y - 2)} ${String(x)} ${String(y - s)} Z`,
    "#ffda72",
    "#c9aa67",
    1.5,
  );
p("M 971 586 C 997 563 1019 553 1031 528", undefined, "#cca974", 2, 0.5);
group = "butterfly";
transform = rotation(20, 1010, 526);
p(
  "M 1009 528 C 973 521 970 482 992 486 Q 1007 489 1011 517 C 1017 483 1043 478 1049 496 C 1056 515 1030 529 1015 531 Q 1041 535 1035 552 C 1026 563 1011 546 1010 535 Q 997 559 985 548 C 981 537 1001 531 1009 528 Z",
  "#f6d984",
  "#b99361",
  2.5,
);
p("M 1010 516 L 1012 543 M 1009 520 L 1002 510 M 1012 519 L 1017 506", undefined, "#9b784f", 2.2);
transform = undefined;
group = "foreground";
for (const [x, y, s, a, c] of [
  [95, 1253, 66, -28, "#7da98d"],
  [152, 1273, 53, 30, "#a4c495"],
  [1162, 1260, 59, 30, "#8db496"],
  [1217, 1254, 66, -30, "#b0cc9a"],
] as const)
  leaf(x, y, s, a, c);
flower(188, 1208, 25);
flower(1119, 1218, 22);

export const butterDocument: PaintDocument = {
  version: 3,
  canvas: { width: 1280, height: 1280, background: "#fff7e5" },
  phase: "reflection",
  shapes,
};
if (import.meta.main) {
  const dir = "out/butter-adventure";
  await mkdir(dir, { recursive: true });
  const doc = parsePaintDocument(butterDocument);
  await Bun.write(`${dir}/document.json`, `${JSON.stringify(doc, null, 2)}\n`);
  await Bun.write(`${dir}/butter.png`, renderDocumentToPng(doc));
  await Bun.write(`${dir}/butter.svg`, renderDocumentToSvg(doc));
  const live = process.argv.indexOf("--live");
  if (live >= 0) {
    const url = process.argv[live + 1] ?? "http://localhost:8901";
    const send = async (path: string, method: string, body: unknown) => {
      const response = await fetch(url + path, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw Error(await response.text());
    };
    await send("/document", "PUT", { ...doc, phase: "base", shapes: [] });
    for (let i = 0; i < shapes.length; i += 4) {
      await send("/shapes", "POST", { shapes: shapes.slice(i, i + 4) });
      await Bun.sleep(600);
    }
    await send("/phase", "POST", { phase: "reflection" });
  }
  console.log(`描画しました: ${dir}/butter.png（${String(shapes.length)}図形）`);
}
