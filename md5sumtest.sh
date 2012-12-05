MD5EXEC="md5sum /dev/mmcblk0p1"
MD5SUM=`$MD5EXEC`
if [ "$?" -ne 0 ]; then
	echo "$MD5EXEC failed"
	exit 1
fi
echo "Looking for $MD5SUM"
i=0
while true;
do
	let i=$i+1
	time NEW=`$MD5EXEC`
	if [ "$MD5SUM" != "$NEW" ]; then 
		echo "FAILED, got $NEW" 
		exit 1
	else 
		echo "SUCCESS ITERATION $i"
	fi
done

