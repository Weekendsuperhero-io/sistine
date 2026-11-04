/*
 * Prints the SoC's CPU / GPU / ANE / DRAM energy once per interval, as JSON lines, without root.
 * Reads Apple Silicon's "Energy Model" IOReport channels — the counters powermetrics and Activity
 * Monitor are built on — through libIOReport (private, but stable, and linkable from the SDK's .tbd).
 *
 *   clang -O2 -o ioreport-sampler ioreport-sampler.c -lIOReport -framework CoreFoundation
 *   ./ioreport-sampler [interval_ms=1000]
 *
 * Each line: {"t": <epoch ms at the END of the interval>, "dt": <ms>, "cpu": J, "gpu": J, "gpuRail": J, "dram": J, "fabric": J}
 * Energies are for that interval (deltas), so power = energy / dt. System-wide: every process counts.
 *   cpu     the E- and P-cluster totals (ECPU + PCPU). The aggregate "CPU Energy" channel equals their sum
 *           but, on an M5, updates only every couple of seconds, so per-second rows alternate with zeros.
 *   gpu     "GPU Energy" (nJ), the channel macmon and asitop report.
 *   gpuRail "GPU" (mJ), a second GPU channel that reads higher: kept so a reader can see both.
 *   dram    "DRAM";  fabric  "DCS" + "AMCC", the memory fabric between them.
 */
#include <CoreFoundation/CoreFoundation.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/time.h>
#include <unistd.h>

typedef struct IOReportSubscription *IOReportSubscriptionRef;
extern CFMutableDictionaryRef IOReportCopyChannelsInGroup(CFStringRef, CFStringRef, uint64_t, uint64_t, uint64_t);
extern IOReportSubscriptionRef IOReportCreateSubscription(void *, CFMutableDictionaryRef, CFMutableDictionaryRef *, uint64_t, CFTypeRef);
extern CFDictionaryRef IOReportCreateSamples(IOReportSubscriptionRef, CFMutableDictionaryRef, CFTypeRef);
extern CFDictionaryRef IOReportCreateSamplesDelta(CFDictionaryRef, CFDictionaryRef, CFTypeRef);
extern CFStringRef IOReportChannelGetChannelName(CFDictionaryRef);
extern CFStringRef IOReportChannelGetUnitLabel(CFDictionaryRef);
extern int64_t IOReportSimpleGetIntegerValue(CFDictionaryRef, int32_t);

static double now_ms(void) {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  return tv.tv_sec * 1000.0 + tv.tv_usec / 1000.0;
}

static double to_joules(int64_t v, CFStringRef unit) {
  char u[16] = "";
  if (unit) CFStringGetCString(unit, u, sizeof u, kCFStringEncodingUTF8);
  if (!strcmp(u, "mJ")) return v / 1e3;
  if (!strcmp(u, "uJ")) return v / 1e6;
  if (!strcmp(u, "nJ")) return v / 1e9;
  return 0; /* not an energy channel */
}

int main(int argc, char **argv) {
  int interval = argc > 1 ? atoi(argv[1]) : 1000;
  CFMutableDictionaryRef channels = IOReportCopyChannelsInGroup(CFSTR("Energy Model"), NULL, 0, 0, 0);
  if (!channels) { fprintf(stderr, "no Energy Model channels (Apple Silicon only)\n"); return 1; }
  CFMutableDictionaryRef subbed = NULL;
  IOReportSubscriptionRef sub = IOReportCreateSubscription(NULL, channels, &subbed, 0, NULL);
  if (!sub) { fprintf(stderr, "IOReportCreateSubscription failed\n"); return 1; }
  setvbuf(stdout, NULL, _IOLBF, 0);

  CFDictionaryRef prev = IOReportCreateSamples(sub, subbed, NULL);
  double prev_t = now_ms();
  for (;;) {
    usleep(interval * 1000);
    CFDictionaryRef cur = IOReportCreateSamples(sub, subbed, NULL);
    double t = now_ms();
    CFDictionaryRef delta = IOReportCreateSamplesDelta(prev, cur, NULL);
    double cpu = 0, gpu = 0, gpuRail = 0, dram = 0, fabric = 0;
    CFArrayRef items = CFDictionaryGetValue(delta, CFSTR("IOReportChannels"));
    for (CFIndex i = 0; items && i < CFArrayGetCount(items); i++) {
      CFDictionaryRef ch = CFArrayGetValueAtIndex(items, i);
      char name[128] = "";
      CFStringRef n = IOReportChannelGetChannelName(ch);
      if (n) CFStringGetCString(n, name, sizeof name, kCFStringEncodingUTF8);
      double j = to_joules(IOReportSimpleGetIntegerValue(ch, 0), IOReportChannelGetUnitLabel(ch));
      if (!strcmp(name, "ECPU") || !strcmp(name, "PCPU")) cpu += j;
      else if (!strcmp(name, "GPU Energy")) gpu += j;
      else if (!strcmp(name, "GPU")) gpuRail += j;
      else if (!strcmp(name, "DRAM")) dram += j;
      else if (!strcmp(name, "DCS") || !strcmp(name, "AMCC")) fabric += j;
    }
    printf("{\"t\":%.0f,\"dt\":%.0f,\"cpu\":%.4f,\"gpu\":%.4f,\"gpuRail\":%.4f,\"dram\":%.4f,\"fabric\":%.4f}\n", t, t - prev_t, cpu, gpu, gpuRail, dram, fabric);
    CFRelease(delta);
    CFRelease(prev);
    prev = cur;
    prev_t = t;
  }
}
