import { mkdir } from "node:fs/promises";
import type { PaintDocument, PaintFill, PaintShape } from "../src/paint-document.ts";
import { parsePaintDocument } from "../src/validate-document.ts";
import { renderDocumentToPng } from "../src/render-document.ts";
import { renderDocumentToSvg } from "../src/render-svg.ts";

// Landmark study of the 01:50 smile. Reference pixels are never part of the artwork.
const shapes: PaintShape[] = [];
let layer = 0,
  group = "beach";
const ink = "#79544c";
const linear = (x1: number, y1: number, x2: number, y2: number, colors: string[]): PaintFill => ({
  kind: "linear",
  x1,
  y1,
  x2,
  y2,
  stops: colors.map((color, i) => ({ offset: i / (colors.length - 1), color })),
});
function p(d: string, fill?: PaintFill, stroke = ink, w = 3.8, opacity = 1, clip?: string): void {
  layer++;
  shapes.push({
    id: `${group}-${String(layer)}`,
    group,
    layer,
    kind: "curve",
    phase: group === "beach" || group === "cart" ? "background" : fill ? "base" : "lineart",
    d,
    stroke,
    strokeWidth: w,
    opacity,
    ...(fill ? { fill } : {}),
    ...(clip ? { clip } : {}),
  });
}
function o(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: PaintFill,
  stroke = "#00000000",
  w = 0,
  opacity = 1,
): void {
  const k = 0.55228475;
  p(
    `M ${String(cx - rx)} ${String(cy)} C ${String(cx - rx)} ${String(cy - ry * k)} ${String(cx - rx * k)} ${String(cy - ry)} ${String(cx)} ${String(cy - ry)} C ${String(cx + rx * k)} ${String(cy - ry)} ${String(cx + rx)} ${String(cy - ry * k)} ${String(cx + rx)} ${String(cy)} C ${String(cx + rx)} ${String(cy + ry * k)} ${String(cx + rx * k)} ${String(cy + ry)} ${String(cx)} ${String(cy + ry)} C ${String(cx - rx * k)} ${String(cy + ry)} ${String(cx - rx)} ${String(cy + ry * k)} ${String(cx - rx)} ${String(cy)} Z`,
    fill,
    stroke,
    w,
    opacity,
  );
}
function flower(x: number, y: number, r: number, stroke = "none"): void {
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    o(
      x + Math.cos(a) * r * 0.58,
      y + Math.sin(a) * r * 0.58,
      r * 0.44,
      r * 0.45,
      "#fff9dd",
      stroke === "none" ? "#00000000" : stroke,
      stroke === "none" ? 0 : 2,
    );
  }
  o(
    x,
    y,
    r * 0.24,
    r * 0.24,
    "#f4cf63",
    stroke === "none" ? "#00000000" : stroke,
    stroke === "none" ? 0 : 1.5,
  );
}
// Warm seaside light, with the ice-cream cart framing the original pose.
p(
  "M 0 0 L 1000 0 L 1000 1120 L 0 1120 Z",
  linear(0, 0, 850, 1120, ["#fff5db", "#e6f4e5", "#fff0d1"]),
  "#00000000",
  0,
);
p(
  "M 0 769 Q 368 736 1000 777 L 1000 1006 L 0 1014 Z",
  linear(0, 768, 0, 1006, ["#bfe1d9", "#d6ece0", "#f9e8c9"]),
  "#00000000",
  0,
);
p(
  "M 0 969 Q 400 907 1000 962 L 1000 1120 L 0 1120 Z",
  linear(0, 961, 0, 1120, ["#f6dfb5", "#fff0d0"]),
  "#00000000",
  0,
);
p(
  "M 2 845 Q 181 827 270 843 M 35 873 Q 123 863 216 875 M 866 935 Q 933 924 1000 937",
  undefined,
  "#fffcef",
  3,
  0.75,
);
o(467, 1012, 238, 24, "#d3b996", "#00000000", 0, 0.38);
group = "cart";
p("M 817 0 L 831 0 L 831 425 L 817 425 Z", "#91b3b8", "#81959e", 3);
p(
  "M 485 0 L 1000 0 L 1000 31 Q 976 58 947 34 Q 919 60 892 33 Q 867 61 839 33 Q 811 62 785 32 Q 757 63 729 31 Q 703 58 678 29 Q 650 56 625 25 Q 600 56 574 20 Q 549 48 521 17 Q 500 41 485 0 Z",
  linear(0, 0, 0, 60, ["#ffe9dd", "#e9bcb6"]),
  "#c49b98",
  3,
);
for (const d of [
  "M 590 0 L 656 0 L 678 29 Q 650 56 625 25 Z",
  "M 732 0 L 782 0 L 785 32 Q 757 63 729 31 Z",
  "M 854 0 L 906 0 L 947 34 Q 919 60 892 33 Z",
])
  p(d, "#fff9e9", "#00000000", 0, 0.9);
p("M 649 408 L 967 411 L 1004 554 L 611 551 Z", "#b4c6c5", "#899c9f", 4);
p("M 675 427 L 944 430 L 969 529 L 648 527 Z", "#e6f3ec", "#8a9ea1", 3);
for (const [x, c] of [
  [673, "#afcbd8"],
  [738, "#ac8e86"],
  [803, "#e2cfab"],
  [870, "#dca6ab"],
] as const)
  p(
    `M ${String(x)} 488 L ${String(x + 52)} 486 L ${String(x + 64)} 530 L ${String(x - 10)} 530 Z`,
    c,
    "#9a8c84",
    3,
  );
p("M 932 432 L 955 429 L 990 538 L 970 542 Z", "#dce4dc", "#8e9d9e", 3);
p(
  "M 637 543 L 1000 552 L 1000 920 Q 858 959 638 921 Z",
  linear(635, 570, 1010, 913, ["#91cbd8", "#80bbd0", "#87b8c7"]),
  "#81959c",
  4,
);
p("M 655 589 L 1000 592 L 1000 612 L 655 609 Z", "#bbe0e5", "#00000000", 0, 0.65);
p("M 774 675 L 1000 670 L 1000 710 L 789 717 L 804 696 Z", "#e0e9e4", "#00000000", 0, 0.78);
p(
  "M 628 539 L 1000 545 L 1000 587 Q 859 595 623 577 Z",
  linear(0, 537, 0, 591, ["#f4d0c3", "#e4b5ad"]),
  "#a18e88",
  4,
);
p("M 643 549 Q 841 563 1000 557", undefined, "#fff0df", 3, 0.75);
o(831, 891, 132, 143, "#8c9393", "#7e898b", 5);
o(831, 891, 95, 103, "#d5e5de", "#a5bdbe", 4);
o(831, 891, 61, 66, "#a6bdbb", "#8b9c9b", 4);
o(831, 891, 26, 29, "#dee7dc");
for (let i = 0; i < 5; i++) {
  const a = (i * Math.PI * 2) / 5;
  o(831 + Math.cos(a) * 76, 891 + Math.sin(a) * 82, 4, 4, "#91a5a5");
}
p("M 700 875 Q 668 840 644 864 Q 626 899 652 936 L 707 947", undefined, "#7e8d90", 22);
p("M -39 665 L 147 623 L 223 1018 L 10 1063 Z", "#bd9366", "#9e795a", 4);
p("M -16 684 L 129 653 L 193 996 L 17 1029 Z", "#79776b", "#846c54", 3);
p("M 143 650 L 167 661 L 244 1006 L 223 1018 Z", "#a57954", "#93714f", 3);
for (const [x, y, c] of [
  [45, 760, "#95d9e3"],
  [64, 861, "#efb0af"],
  [82, 957, "#f5ddaa"],
] as const) {
  p(
    `M ${String(x - 14)} ${String(y + 9)} L ${String(x + 18)} ${String(y + 2)} L ${String(x + 5)} ${String(y + 26)} Z`,
    "#d4aa72",
    "#00000000",
    0,
  );
  o(x, y, 16, 12, c);
  p(
    `M ${String(x + 28)} ${String(y - 2)} L ${String(x + 66)} ${String(y - 9)} M ${String(x + 31)} ${String(y + 8)} L ${String(x + 59)} ${String(y + 3)}`,
    undefined,
    "#d9d3bb",
    2,
    0.65,
  );
}
group = "hair-back";
layer = 500;
const back =
  "M 265 228 C 253 164 311 101 388 94 C 426 87 447 93 468 101 C 446 84 467 66 500 63 Q 527 55 556 69 Q 508 67 493 87 Q 489 96 503 105 C 578 88 658 93 703 122 C 735 166 736 226 738 272 C 744 413 784 469 782 543 Q 785 584 747 606 L 754 579 Q 738 605 711 611 L 720 589 Q 685 619 655 606 C 604 581 580 545 536 523 L 351 524 Q 319 552 272 546 C 249 504 250 437 250 385 Z";
p(back, linear(295, 134, 723, 547, ["#e3c9ad", "#dfc3a9", "#ccaa99"]), ink, 4.3);
p("M 304 138 Q 369 85 445 98 L 459 109 Q 388 101 330 153 Z", "#fff0d5", "#00000000", 0, 0.65, back);
p(
  "M 607 140 C 656 217 673 338 701 437 Q 727 529 747 577 L 711 611 Q 685 619 655 606 C 604 581 580 545 536 523 L 579 345 Z",
  "#b58a7c",
  "#00000000",
  0,
  0.72,
  back,
);
p(
  "M 681 226 C 676 362 734 474 745 548 Q 750 572 742 588 C 721 560 697 501 682 449 C 665 379 657 304 681 226 Z",
  "#f4dec0",
  "#00000000",
  0,
  0.6,
  back,
);
p(
  "M 273 301 C 268 418 278 497 305 538 L 272 546 Q 247 477 250 385 Z",
  "#b58b80",
  "#00000000",
  0,
  0.65,
  back,
);
p("M 690 394 C 707 486 734 540 735 573 M 286 407 Q 289 476 312 513", undefined, "#aa7b71", 2, 0.45);
group = "tail";
const tail =
  "M 554 669 C 625 643 700 641 759 601 Q 783 586 798 567 C 815 608 788 663 752 690 L 767 686 Q 749 720 716 728 L 735 725 Q 705 750 665 742 C 611 741 575 714 554 669 Z";
p(tail, linear(636, 640, 696, 749, ["#f1d9bd", "#ecd1b7", "#cfa798"]), ink, 4.2);
p(
  "M 603 704 Q 665 733 726 704 L 708 701 Q 758 681 790 625 C 781 672 752 690 752 690 L 767 686 Q 749 720 716 728 L 735 725 Q 705 750 665 742 Z",
  "#c79f8d",
  "#00000000",
  0,
  0.55,
  tail,
);
p("M 618 673 Q 679 668 726 641 Q 699 683 657 686 Z", "#fbe6ca", "#00000000", 0, 0.7, tail);
group = "shorts";
p(
  "M 331 677 L 551 677 L 559 739 Q 495 746 431 726 Q 373 736 329 719 Z",
  linear(0, 679, 0, 745, ["#f7d1ce", "#ecc0bc"]),
  ink,
  4,
);
p(
  "M 429 688 L 431 726 M 338 710 Q 381 724 423 718 M 442 720 Q 498 738 552 731",
  undefined,
  "#ba8c85",
  2.5,
);
group = "leg-back";
const legBack =
  "M 332 719 L 425 734 C 424 790 434 851 446 896 L 455 944 Q 460 971 435 984 L 403 992 Q 381 988 371 964 C 346 913 329 856 322 795 Q 319 760 332 719 Z";
p(legBack, linear(325, 732, 433, 973, ["#ebc6c1", "#f8dfd9", "#fae7df"]), ink, 4);
p(
  "M 333 720 L 425 737 L 432 850 L 445 912 C 415 890 381 856 325 813 Q 319 760 333 720 Z",
  "#cba09b",
  "#00000000",
  0,
  0.6,
  legBack,
);
p("M 336 817 Q 348 905 382 959", undefined, "#fff1e5", 2.5, 0.65);
group = "leg-front";
const legFront =
  "M 426 727 L 557 740 L 556 810 Q 544 838 553 860 L 586 928 Q 599 956 578 981 L 548 998 Q 520 1001 505 976 C 474 928 444 876 429 845 L 425 782 Z";
p(legFront, linear(457, 739, 529, 982, ["#f4d6d1", "#fff0e8", "#fce7dd"]), ink, 4.2);
p(
  "M 431 736 Q 496 746 553 757 L 553 782 Q 507 767 427 773 Z",
  "#d4aaa3",
  "#00000000",
  0,
  0.56,
  legFront,
);
o(492, 840, 32, 24, "#f8d8d2", "#00000000", 0, 0.4);
p("M 551 811 Q 543 826 548 842", undefined, "#af817a", 2.4);
group = "sandals";
p(
  "M 378 972 Q 403 992 437 971 L 447 984 Q 443 1005 418 1010 L 390 1007 Q 377 1004 376 991 Z",
  "#f7d779",
  ink,
  3.8,
);
p(
  "M 510 978 Q 547 1000 578 977 L 584 991 Q 576 1015 550 1020 L 524 1015 Q 513 1008 510 998 Z",
  "#f8d878",
  ink,
  3.8,
);
p("M 384 987 L 409 970 L 438 991 M 520 995 L 544 978 L 574 996", undefined, ink, 9);
p("M 384 987 L 409 970 L 438 991 M 520 995 L 544 978 L 574 996", undefined, "#fffae8", 5);
flower(410, 974, 18, ink);
flower(547, 981, 18, ink);
group = "arm-left";
p(
  "M 368 519 Q 344 537 322 548 L 251 545 L 242 591 Q 289 607 341 606 Q 369 586 385 554 Z",
  "#feeee7",
  ink,
  4.2,
);
p("M 262 549 L 279 552 L 273 601 L 257 598 Z", "#ffdda0", ink, 2.5);
p("M 267 552 L 264 596", undefined, "#fff5d0", 2);
p("M 279 592 Q 309 598 337 592", undefined, "#e7c0b8", 3, 0.6);
group = "vest";
const vest =
  "M 369 461 L 431 469 L 453 477 L 535 452 C 547 497 544 534 558 568 Q 593 628 608 688 L 459 691 L 446 608 L 434 683 Q 373 682 321 710 C 305 686 319 633 330 599 Q 352 545 351 506 Z";
p(vest, linear(344, 490, 558, 686, ["#ffb057", "#ffdc80", "#fbd573"]), ink, 4.5);
p("M 361 467 L 429 475 L 441 546 L 351 545 L 352 505 Z", "#ff9b46", ink, 3.2);
p(
  "M 453 481 L 535 457 L 540 534 L 446 551 Z",
  linear(449, 481, 533, 534, ["#ffb04a", "#ff8f39"]),
  ink,
  3.2,
);
p(
  "M 336 608 C 324 649 318 681 321 710 Q 373 684 434 683 L 437 665 Q 361 662 336 687 Z",
  "#ed992f",
  "#00000000",
  0,
  0.65,
  vest,
);
p(
  "M 552 549 Q 586 616 605 683 L 588 676 Q 570 603 545 573 Z",
  "#e8a445",
  "#00000000",
  0,
  0.5,
  vest,
);
p("M 327 698 Q 371 678 431 680 M 459 682 L 600 685", undefined, "#e78e28", 7);
p("M 330 691 Q 376 675 431 675 M 462 676 L 598 678", undefined, "#fff0a9", 2.5);
p("M 430 486 L 448 482 L 458 693 L 441 693 Z", "#fff6e6", ink, 3);
p("M 432 494 L 446 551 L 448 673", undefined, "#bd7350", 2.5);
flower(352, 581, 15);
flower(382, 647, 16);
flower(524, 594, 17);
flower(558, 652, 16);
group = "collar";
p("M 368 439 L 531 436 L 537 468 Q 477 490 438 495 L 366 469 Z", "#f5d7ca", ink, 3.5);
p(
  "M 354 446 Q 390 443 429 449 Q 448 451 444 477 L 365 474 Q 347 472 354 446 Z",
  linear(0, 448, 0, 478, ["#ffe298", "#f7c55e"]),
  ink,
  3.8,
);
p(
  "M 458 454 L 532 438 Q 550 437 549 456 L 544 472 L 466 488 Q 454 479 458 454 Z",
  linear(0, 443, 0, 484, ["#ffe9a4", "#f6c65b"]),
  ink,
  3.8,
);
p("M 364 451 L 425 456 M 470 459 L 537 446", undefined, "#fff0b9", 2.4);
group = "arm-right";
p(
  "M 543 517 L 574 523 L 575 545 Q 601 541 635 515 L 635 503 Q 639 487 655 488 Q 667 476 681 492 Q 699 489 703 505 L 708 522 Q 717 538 692 547 C 663 568 616 595 588 583 C 560 575 545 552 543 517 Z",
  linear(577, 507, 630, 581, ["#fff0e9", "#fdebe4", "#f6d9d2"]),
  ink,
  4.3,
);
p("M 667 499 Q 680 508 675 524 Q 678 538 692 537", undefined, ink, 3.5);
p("M 576 566 Q 592 580 611 574", undefined, "#e5bfb8", 2, 0.75);
group = "necklaces";
p("M 376 478 L 387 476 L 446 550 L 439 558 Z", "#fff9ea", ink, 3.2);
p("M 528 479 L 516 482 L 450 553 L 459 558 Z", "#fff6e4", ink, 3.2);
p(
  "M 393 479 L 401 483 L 446 542 L 450 534 L 497 482 L 506 480 L 455 553 L 442 553 Z",
  "#a8574d",
  ink,
  2.8,
);
p(
  "M 442 578 L 469 578 L 475 613 L 439 622 Z",
  linear(441, 580, 471, 616, ["#b58155", "#996643"]),
  ink,
  3.6,
);
p("M 445 610 L 470 604", undefined, "#e3b078", 2);
p(
  "M 429 548 Q 444 539 461 547 Q 475 546 479 558 L 479 570 Q 470 588 448 586 Q 430 584 423 571 L 417 573 Q 409 572 412 563 Q 415 550 429 548 Z",
  "#dcbaa0",
  ink,
  3.2,
);
p(
  "M 425 550 Q 410 551 408 565 Q 409 575 422 572 Z M 463 548 Q 479 546 486 560 Q 487 570 476 573 Z",
  "#bd907f",
  ink,
  2.5,
);
o(438, 560, 2.7, 4, "#85534a");
o(457, 559, 2.7, 4, "#85534a");
o(432, 568, 4, 3, "#ef9f97");
o(465, 567, 4, 3, "#ef9f97");
p(
  "M 445 568 L 450 568 L 447 572 M 447 572 Q 442 578 439 573 M 447 572 Q 452 578 456 572",
  undefined,
  "#89554b",
  1.8,
);
group = "face";
const face =
  "M 295 277 C 338 251 426 252 501 258 C 558 267 586 307 586 348 L 593 397 Q 595 419 578 430 C 526 451 397 452 328 441 C 288 437 266 425 262 407 C 256 395 253 380 265 363 C 274 344 285 335 287 314 Z";
p(face, linear(0, 282, 0, 449, ["#f5d9d1", "#feefea", "#feefea"]), ink, 4.2);
p(
  "M 265 395 Q 270 424 330 432 Q 438 450 575 425 L 578 430 C 526 451 397 452 328 441 Q 272 435 262 407 Z",
  "#ecc9c0",
  "#00000000",
  0,
  0.5,
  face,
);
o(307, 386, 49, 36, "#ffb0ad");
o(542, 394, 53, 36, "#ffb0ad");
for (const [x, y] of [
  [280, 384],
  [299, 388],
  [320, 389],
  [514, 393],
  [535, 398],
  [555, 398],
] as const)
  p(
    `M ${String(x)} ${String(y)} L ${String(x + 6)} ${String(y - 8)}`,
    undefined,
    "#f49796",
    3.2,
    0.7,
  );
group = "smiling-eyes";
p(
  "M 326 342 C 331 326 337 314 344 309 L 343 300 L 350 306 Q 354 304 359 305 C 379 303 391 320 394 344 L 389 349 C 383 328 375 316 361 317 C 348 317 337 330 332 346 Z",
  "#79544c",
  "#00000000",
  0,
);
p(
  "M 462 345 C 470 321 484 307 500 307 C 513 307 522 315 528 325 L 532 317 L 534 335 Q 538 345 540 353 L 534 359 C 527 335 516 320 501 319 C 485 318 474 332 469 351 Z",
  "#79544c",
  "#00000000",
  0,
);
layer += 1; // Lash flicks are integrated into the closed eyelid contours.
p("M 353 297 Q 366 291 376 299 M 499 298 Q 512 294 523 303", undefined, "#986e63", 3.4);
group = "tongue-smile";
p(
  "M 416 380 Q 421 385 427 380 Q 435 385 443 379 C 450 397 444 413 431 419 Q 414 421 413 406 Q 411 393 416 380 Z",
  linear(420, 383, 437, 417, ["#f59c9e", "#f88891"]),
  ink,
  3.5,
);
layer += 1; // The lip and tongue share a continuous contour.
p("M 429 388 L 427 400", undefined, "#b8696d", 2.4);
group = "hair-front";
const bangs =
  "M 308 207 C 364 175 484 167 545 213 C 567 234 565 259 582 285 Q 550 294 515 280 Q 481 289 458 276 Q 423 294 393 274 Q 363 287 340 268 Q 329 286 306 291 L 294 335 Q 286 354 271 349 C 268 301 283 247 308 207 Z";
p(bangs, linear(338, 208, 469, 283, ["#dfc2a8", "#d4b09f", "#c59f93"]), ink, 4);
p(
  "M 329 246 Q 361 257 392 247 Q 431 262 460 249 Q 510 259 552 253 Q 564 278 582 285 Q 550 294 515 280 Q 481 289 458 276 Q 423 294 393 274 Q 363 287 340 268 Q 329 286 306 291 Z",
  "#b79288",
  "#00000000",
  0,
  0.6,
  bangs,
);
p(
  "M 344 221 Q 337 249 340 268 M 393 214 Q 388 248 393 274 M 460 218 Q 460 252 515 280",
  undefined,
  "#a97e72",
  2.3,
);
p("M 333 258 Q 343 252 352 260 L 340 267 Z M 493 267 Q 508 265 515 280", undefined, "#a77a70", 2.5);
const leftLock =
  "M 296 221 C 269 250 254 305 269 342 Q 272 347 277 350 C 254 350 245 336 244 322 C 232 350 233 402 255 439 Q 271 462 311 477 C 270 464 244 453 232 426 C 217 391 216 340 221 303 Q 220 267 234 242 Z";
p(leftLock, linear(234, 254, 287, 438, ["#e5c9ac", "#ddbea5", "#d5b19c"]), ink, 4.2);
p(
  "M 242 283 C 220 361 234 428 283 461 Q 255 449 242 429 C 217 372 226 313 242 283 Z",
  "#b98f81",
  "#00000000",
  0,
  0.5,
  leftLock,
);
p("M 280 245 Q 258 282 260 315", undefined, "#f6dfbf", 5, 0.6);
const rightLock =
  "M 567 221 L 613 230 C 631 276 626 335 604 365 Q 581 390 550 388 C 573 358 578 316 556 285 Q 543 267 537 244 Z";
p(rightLock, linear(553, 251, 614, 369, ["#e5c8ab", "#e3c4a7", "#d2ac96"]), ink, 4.2);
p(
  "M 611 254 C 624 320 596 369 558 384 Q 591 378 604 365 C 626 335 631 276 613 230 Z",
  "#c29a88",
  "#00000000",
  0,
  0.5,
  rightLock,
);
p("M 590 253 Q 608 302 589 343", undefined, "#f5dfbd", 5, 0.5);
// Long bob ends frame the neck without narrowing the cheeks.
p(
  "M 581 374 C 581 418 568 457 539 481 Q 584 485 623 457 Q 667 428 659 353 L 630 297 C 633 347 615 375 581 374 Z",
  linear(578, 376, 644, 446, ["#e9cfb2", "#e3c6a9", "#c5a08d"]),
  ink,
  4,
);
p("M 634 340 Q 651 424 615 457", undefined, "#b9907e", 2, 0.5);
group = "ears";
p(
  "M 348 107 C 307 104 274 129 249 152 Q 220 169 204 193 C 188 224 201 243 231 245 Q 265 242 284 214 L 313 156 Z",
  linear(218, 160, 266, 240, ["#e8cdb0", "#dcc0a7", "#bd9785"]),
  ink,
  4.3,
);
p(
  "M 207 201 Q 236 168 279 156 C 258 180 246 219 227 232 Q 209 237 207 201 Z",
  "#bc9584",
  "#00000000",
  0,
  0.45,
);
p("M 213 190 Q 250 151 285 137", undefined, "#f8e4c7", 4, 0.6);
p(
  "M 583 113 C 644 93 686 106 706 129 Q 735 179 809 194 C 827 202 802 229 780 246 C 753 268 720 268 691 252 C 654 229 631 189 613 159 Z",
  linear(636, 120, 749, 255, ["#ecd4b7", "#e2c4a7", "#d3b098"]),
  ink,
  4.5,
);
p(
  "M 639 153 C 672 180 718 218 799 217 Q 755 282 691 252 C 668 239 653 216 639 193 Z",
  "#bc9380",
  "#00000000",
  0,
  0.4,
);
p("M 643 115 Q 677 112 696 137 Q 729 185 776 196", undefined, "#fae6c7", 4, 0.5);
group = "sunglasses";
p(
  "M 278 169 Q 266 196 266 222 L 283 226 L 293 173 Z M 588 195 C 602 215 618 248 624 275 L 638 282 C 633 249 615 217 602 193 Z",
  "#78493e",
  "#4e332f",
  3.5,
);
const glasses =
  "M 293 150 C 274 146 262 158 268 172 Q 258 185 270 194 C 262 235 278 249 312 253 C 350 263 390 248 411 222 L 425 205 Q 433 199 443 208 C 454 243 478 251 518 248 C 554 247 584 228 594 207 Q 620 211 624 194 Q 630 177 613 168 C 618 151 607 143 593 150 L 579 149 C 549 135 509 142 483 153 Q 455 164 430 171 Q 412 164 395 158 C 363 144 326 143 311 151 Q 301 140 293 150 Z";
p(glasses, linear(0, 151, 0, 252, ["#ffe7a1", "#f9d773", "#efbd58"]), ink, 4.3);
p(
  "M 292 183 C 313 166 355 168 381 180 C 400 190 390 215 372 230 C 348 242 309 246 291 231 Q 278 215 292 183 Z",
  linear(313, 174, 370, 236, ["#705044", "#6f4a41", "#856253"]),
  "#96713e",
  2.4,
);
p(
  "M 460 183 C 484 167 528 164 556 174 Q 587 184 575 207 C 561 228 517 240 481 231 Q 458 223 455 207 Z",
  linear(475, 172, 554, 232, ["#69483f", "#7b5348", "#896655"]),
  "#96713e",
  2.4,
);
p(
  "M 344 172 L 360 173 L 329 239 L 316 240 Z M 526 169 L 541 171 L 504 234 L 492 233 Z",
  "#b79b7d",
  "#00000000",
  0,
  0.17,
);
o(317, 192, 24, 13, "#fff0dc");
o(494, 187, 25, 13, "#fff0dc");
p(
  "M 278 179 Q 288 163 307 160 M 451 184 Q 500 150 556 165 M 295 244 Q 347 256 387 229",
  undefined,
  "#fff0b8",
  2.6,
  0.8,
);
o(285, 240, 21, 12, linear(0, 231, 0, 249, ["#ffb5ac", "#ed7d83"]), "#bc7065", 2.5);
o(573, 239, 20, 11, linear(0, 231, 0, 249, ["#ffb5ac", "#ed7d83"]), "#bc7065", 2.5);
o(281, 236, 9, 4, "#ffd7c6");
o(570, 235, 9, 4, "#ffd7c6");
group = "ice-cream";
const cone = "M 170 488 L 251 480 L 244 617 Q 241 626 235 618 Z";
p(cone, linear(174, 498, 247, 579, ["#efcf91", "#e6bb7b", "#d8a66a"]), ink, 3.8);
for (let i = 0; i < 8; i++) {
  const y = 485 + i * 19;
  p(
    `M 166 ${String(y)} L 254 ${String(y + 49)} M 165 ${String(y + 36)} L 260 ${String(y - 13)}`,
    undefined,
    "#c2935e",
    2,
    0.65,
    cone,
  );
}
p("M 174 490 L 237 611", undefined, "#ffe7af", 2, 0.55);
p(
  "M 158 472 Q 164 462 177 470 Q 197 457 214 467 Q 236 458 254 470 Q 266 479 253 488 L 172 501 Q 157 501 157 490 Q 145 489 150 480 Z",
  linear(0, 468, 0, 500, ["#92e7ed", "#58c7e7", "#31b5e1"]),
  ink,
  3.5,
);
p(
  "M 158 456 Q 160 444 178 450 Q 194 437 211 447 Q 231 438 247 451 Q 267 458 259 470 Q 251 478 234 475 Q 216 486 201 475 Q 180 482 172 474 Q 154 476 151 465 Z",
  linear(0, 448, 0, 478, ["#ffd0ba", "#ffaaa8", "#f798a0"]),
  ink,
  3.5,
);
const scoop =
  "M 169 361 C 194 349 224 361 238 379 Q 251 377 256 390 Q 264 400 254 414 C 268 427 260 445 242 445 Q 238 461 221 458 Q 201 471 183 457 Q 168 474 151 458 Q 135 461 140 442 Q 121 437 132 417 Q 116 409 127 393 Q 133 381 147 379 Q 142 369 155 364 Q 160 359 169 361 Z";
p(scoop, linear(0, 360, 0, 464, ["#fff2c0", "#ffecb0", "#f8d99a"]), ink, 3.8);
p(
  "M 142 422 Q 152 457 181 447 Q 195 461 221 447 Q 247 446 253 429 Q 259 449 242 445 Q 238 461 221 458 Q 201 471 183 457 Q 168 474 151 458 Q 135 461 140 442 Z",
  "#e8be80",
  "#00000000",
  0,
  0.48,
  scoop,
);
p("M 160 369 Q 140 361 127 387 Q 119 400 128 405 Q 141 403 146 386 Z", "#e9c182", ink, 2.8);
p("M 233 381 Q 247 362 261 369 Q 267 379 247 393 Z", "#f9dda0", ink, 2.8);
o(174, 390, 2.8, 4.3, "#775145");
o(193, 389, 2.8, 4.3, "#775145");
p("M 181 399 Q 186 395 190 399 L 186 404 Z", "#805449", "#00000000", 0);
p("M 186 404 Q 180 412 175 405 M 186 404 Q 192 412 197 404", undefined, "#805449", 2);
p("M 163 379 Q 172 368 187 369", undefined, "#fff9d9", 3, 0.85);
o(206, 377, 7, 4, "#fff9db", "#00000000", 0, 0.65);
group = "ice-hand";
p(
  "M 230 536 Q 239 533 247 545 L 252 579 Q 259 590 248 598 L 237 597 Q 240 610 225 609 Q 211 607 210 588 L 207 566 Q 196 555 204 544 Q 211 535 218 542 Z",
  "#fff0e9",
  ink,
  3.8,
);
p("M 212 563 Q 222 565 232 553 M 213 583 Q 220 590 232 585", undefined, "#bb8c81", 2.2);
group = "watermelon-bag";
p("M 469 600 L 493 625 M 601 593 L 618 621", undefined, ink, 9);
p("M 469 600 L 493 625 M 601 593 L 618 621", undefined, "#fff6e8", 5);
o(494, 622, 9, 12, "#f2c56b", ink, 2.8);
o(615, 620, 9, 12, "#f2c56b", ink, 2.8);
const melon = "M 491 625 L 631 618 Q 641 691 585 719 C 539 750 492 710 491 625 Z";
p(melon, linear(491, 660, 623, 706, ["#075d39", "#0b9b55", "#04763d"]), ink, 4.2);
p(
  "M 510 682 L 525 720 L 539 729 L 527 696 Z M 555 715 L 563 730 L 579 724 L 569 710 Z M 603 699 L 616 705 L 627 684 L 613 680 Z",
  "#034a33",
  "#00000000",
  0,
  0.7,
  melon,
);
p(
  "M 502 631 L 622 625 Q 624 682 585 707 C 550 732 515 699 502 631 Z",
  linear(507, 628, 595, 707, ["#ff7677", "#f65057", "#e92d3b"]),
  "#e6ecbe",
  5,
);
for (const [x, y] of [
  [544, 651],
  [579, 642],
  [607, 651],
  [584, 679],
  [551, 685],
] as const)
  p(
    `M ${String(x)} ${String(y - 7)} Q ${String(x + 7)} ${String(y)} ${String(x + 3)} ${String(y + 9)} Q ${String(x - 6)} ${String(y + 13)} ${String(x - 6)} ${String(y + 3)} Q ${String(x - 5)} ${String(y - 3)} ${String(x)} ${String(y - 7)} Z`,
    "#6c3a35",
    "#00000000",
    0,
  );
p("M 511 634 L 613 629", undefined, "#ffb5a5", 2.5, 0.65);
group = "delight";
layer = 2000;
for (const [x, y, s] of [
  [225, 112, 43],
  [482, 35, 55],
  [816, 122, 48],
] as const) {
  p(
    `M ${String(x)} ${String(y + s * 0.7)} C ${String(x - s * 1.2)} ${String(y)} ${String(x - s)} ${String(y - s * 0.9)} ${String(x - s * 0.3)} ${String(y - s * 0.55)} Q ${String(x)} ${String(y - s * 0.4)} ${String(x)} ${String(y - s * 0.12)} C ${String(x + s * 0.45)} ${String(y - s * 0.95)} ${String(x + s * 1.2)} ${String(y - s * 0.5)} ${String(x + s * 0.7)} ${String(y + s * 0.1)} Z`,
    linear(x, y - s, x, y + s, ["#f78b81", "#f7aba0"]),
    "#dc8d85",
    1.5,
    0.88,
  );
  o(x - s * 0.4, y - s * 0.36, s * 0.13, s * 0.08, "#ffd9bd", "#00000000", 0, 0.65);
}
for (const [x, y, s] of [
  [539, 110, 12],
  [692, 238, 14],
  [508, 360, 10],
  [627, 359, 8],
] as const)
  p(
    `M ${String(x)} ${String(y - s)} Q ${String(x + 2)} ${String(y - 2)} ${String(x + s)} ${String(y)} Q ${String(x + 2)} ${String(y + 2)} ${String(x)} ${String(y + s)} Q ${String(x - 2)} ${String(y + 2)} ${String(x - s)} ${String(y)} Q ${String(x - 2)} ${String(y - 2)} ${String(x)} ${String(y - s)} Z`,
    "#fff8ca",
    "#00000000",
    0,
    0.9,
  );
group = "sand-details";
p(
  "M 790 1045 L 802 1037 L 809 1025 L 820 1036 L 834 1039 L 827 1050 L 828 1065 L 812 1060 L 799 1066 L 797 1052 Z",
  "#f0d098",
  "#d3b486",
  2,
);
o(217, 1047, 26, 8, "#c4e3df", "#94c6c7", 2);
o(240, 1037, 10, 6, "#d5e9df");
for (let i = 0; i < 24; i++)
  o(
    70 + ((i * 157) % 880),
    1004 + ((i * 37) % 102),
    1.5 + (i % 3),
    1,
    "#d9bd92",
    "#00000000",
    0,
    0.55,
  );

export const lifeguardDocument: PaintDocument = {
  version: 3,
  canvas: { width: 1000, height: 1120, background: "#fff5df" },
  phase: "reflection",
  shapes,
};
if (import.meta.main) {
  const dir = "out/butter-lifeguard";
  await mkdir(dir, { recursive: true });
  const doc = parsePaintDocument(lifeguardDocument);
  await Bun.write(`${dir}/document.json`, `${JSON.stringify(doc, null, 2)}\n`);
  await Bun.write(`${dir}/butter-lifeguard.png`, renderDocumentToPng(doc));
  await Bun.write(`${dir}/butter-lifeguard.svg`, renderDocumentToSvg(doc));
  const index = process.argv.indexOf("--live");
  if (index >= 0) {
    const host = process.argv[index + 1] ?? "http://localhost:8901";
    const send = async (path: string, method: string, value: unknown) => {
      const r = await fetch(host + path, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(value),
      });
      if (!r.ok) throw Error(await r.text());
    };
    await send("/document", "PUT", { ...doc, phase: "base", shapes: [] });
    for (let i = 0; i < shapes.length; i += 4) {
      await send("/shapes", "POST", { shapes: shapes.slice(i, i + 4) });
      await Bun.sleep(600);
    }
    await send("/phase", "POST", { phase: "reflection" });
  }
  console.log(`描画しました: ${dir}/butter-lifeguard.png（${String(shapes.length)}図形）`);
}
