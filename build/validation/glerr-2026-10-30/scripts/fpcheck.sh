for d in /root/cof-envpos/suite-dist-fix-* /root/cof-envpos/suite-dist-glfix-* /root/cof-glerr/quads-*; do
  [ -d "$d" ] || continue
  n=$(cat $d/*.log $d/*.out 2>/dev/null | grep -c 'Invalid function pointer'); echo "$d $n"
done
